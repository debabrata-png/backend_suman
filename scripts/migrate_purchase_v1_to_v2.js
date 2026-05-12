/**
 * Purchase Module — V1 → V2 Data Migration Script
 * =================================================
 * Copies data from every v1 (old) purchase collection into the
 * corresponding v2 (latest) collection.
 *
 * Collections migrated:
 *  1.  mpurchases            → mpurchases         (same name, kept for completeness)
 *  2.  mpurchaseitems        → mpurchaseitems
 *  3.  itemcategoryds        → itemcategoryds2
 *  4.  itemmasterds          → itemmasterds2
 *  5.  itemtypeds            → itemtypeds2
 *  6.  itemunitds            → itemunitds2
 *  7.  vendords              → vendords2
 *  8.  vendoritemds          → vendoritemds2
 *  9.  storepoorderds        → storepoorderds2
 * 10.  storepoitemsds        → storepoitemsds2
 * 11.  storemasterds         → storemasterds2
 * 12.  storeuserds           → storeuserds2
 * 13.  stockregisterds       → stockregisterds2
 * 14.  storepoapprovalds     → storepoapprovalds2
 * 15.  storerequisationds    → storerequisationds2
 * 16.  requisitionds         → requisitionds2
 * 17.  prassigneds           → prassigneds2
 * 18.  prconfigds            → prconfigds2
 * 19.  poconfigds            → poconfigds2
 * 20.  approvalconfigds      → approvalconfigds2
 * 21.  deliverydsds          → deliverydsds2
 * 22.  CashApprovalds        → CashApprovalds2
 * 23.  pimprestds            → pimprestds2
 *
 * Usage:
 *   node scripts/migrate_purchase_v1_to_v2.js
 *
 * Options (set via env vars):
 *   DRY_RUN=true   → logs what would be inserted without writing to DB
 *   SKIP_EXISTING=true → skip collections that already have data in v2
 *
 * Requirements:
 *   - This script must be run from the backend-main root directory.
 *   - Reads DATABASE2 from config.env (same connection as the app).
 */

'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// ── Load config ──────────────────────────────────────────────────────────────
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const DRY_RUN = process.env.DRY_RUN === 'true';
const SKIP_EXISTING = process.env.SKIP_EXISTING === 'true';

// ── Connection string (use DATABASE2 — the live app DB) ───────────────────────
const MONGO_URI = process.env.DATABASE2;
if (!MONGO_URI) {
    console.error('❌  DATABASE2 is not set in config.env');
    process.exit(1);
}

// ── Migration pairs: { from: 'collectionName', to: 'collectionName' } ─────────
//    Both collections live in the same MongoDB database/cluster.
//    We read raw documents from `from` and insert them into `to`,
//    stripping the _id so Mongo generates a fresh one (avoids duplicate key errors).
const MIGRATION_PAIRS = [

    // Master data
    { from: 'itemcategoryds', to: 'itemcategoryds2' },
    { from: 'itemmasterds', to: 'itemmasterds2' },
    { from: 'itemtypeds', to: 'itemtypeds2' },
    { from: 'itemunitds', to: 'itemunitds2' },

    // Vendor
    { from: 'vendords', to: 'vendords2' },
    { from: 'vendoritemds', to: 'vendoritemds2' },

    // Store / PO
    { from: 'storepoorderds', to: 'storepoorderds2' },
    { from: 'storepoitemsds', to: 'storepoitemsds2' },
    { from: 'storemasterds', to: 'storemasterds2' },
    { from: 'storeuserds', to: 'storeuserds2' },
    { from: 'stockregisterds', to: 'stockregisterds2' },
    { from: 'storepoapprovalds', to: 'storepoapprovalds2' },
    { from: 'storerequisationds', to: 'storerequisationds2' },

    // Requisition / assignment / config
    { from: 'requisitionds', to: 'requisitionds2' },
    { from: 'prassigneds', to: 'prassigneds2' },
    { from: 'prconfigds', to: 'prconfigds2' },
    { from: 'poconfigds', to: 'poconfigds2' },
    { from: 'approvalconfigds', to: 'approvalconfigds2' },

    // Delivery / gate-pass
    { from: 'deliverydsds', to: 'deliverydsds2' },

    // Cash approval & petty cash
    { from: 'cashapprovalds', to: 'cashapprovalds2' },   // Mongoose lowercases model names
    { from: 'pimprestds', to: 'pimprestds2' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * Strip _id from a plain doc object so MongoDB generates a new one.
 * Keeps all other fields intact (including nested arrays / subdocs).
 */
function stripId(doc) {
    const { _id, __v, ...rest } = doc;
    return rest;
}

/**
 * Migrate one collection pair.
 * Returns { inserted, skipped, errors } counts.
 */
async function migratePair(db, pair) {
    const { from, to, note } = pair;

    // Skip identity pairs (same collection name)
    if (from === to || note?.includes('skipped')) {
        console.log(`  ⏭  Skipping ${from} → ${to}  (${note})`);
        return { inserted: 0, skipped: 0, errors: 0 };
    }

    const fromCol = db.collection(from);
    const toCol = db.collection(to);

    // Count source documents
    const sourceCount = await fromCol.countDocuments();
    if (sourceCount === 0) {
        console.log(`  ⚠️  ${from} is empty — nothing to migrate.`);
        return { inserted: 0, skipped: 0, errors: 0 };
    }

    // Optionally skip if destination already has data
    if (SKIP_EXISTING) {
        const destCount = await toCol.countDocuments();
        if (destCount > 0) {
            console.log(`  ⏭  ${to} already has ${destCount} docs — skipping (SKIP_EXISTING=true).`);
            return { inserted: 0, skipped: sourceCount, errors: 0 };
        }
    }

    console.log(`  📦  ${from} → ${to}  (${sourceCount} docs)`);

    if (DRY_RUN) {
        console.log(`       [DRY RUN] Would insert ${sourceCount} document(s).`);
        return { inserted: 0, skipped: sourceCount, errors: 0 };
    }

    // Batch insert (1000 docs at a time to avoid memory issues)
    const BATCH_SIZE = 1000;
    let inserted = 0;
    let errors = 0;
    let skip = 0;

    while (true) {
        const docs = await fromCol
            .find({})
            .skip(skip)
            .limit(BATCH_SIZE)
            .toArray();

        if (docs.length === 0) break;

        const cleaned = docs.map(stripId);

        try {
            const result = await toCol.insertMany(cleaned, { ordered: false });
            inserted += result.insertedCount;
        } catch (err) {
            // ordered:false lets partial batches succeed; collect duplicate errors silently
            if (err.code === 11000 || err.name === 'MongoBulkWriteError') {
                const ok = err.result?.nInserted ?? 0;
                const bad = docs.length - ok;
                inserted += ok;
                errors += bad;
                console.warn(`       ⚠️  ${bad} duplicate(s) skipped in this batch.`);
            } else {
                throw err;
            }
        }

        skip += docs.length;
        if (docs.length < BATCH_SIZE) break;
    }

    console.log(`       ✅  Inserted: ${inserted}, Errors/Dupes: ${errors}`);
    return { inserted, skipped: 0, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🚀  Purchase Module V1 → V2 Migration');
    console.log('======================================');
    if (DRY_RUN) console.log('   MODE: DRY RUN (no writes will be made)\n');
    if (SKIP_EXISTING) console.log('   SKIP_EXISTING: ON (v2 collections with data will be skipped)\n');

    // Connect
    await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('✅  Connected to MongoDB\n');

    const db = mongoose.connection.db;

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const pair of MIGRATION_PAIRS) {
        try {
            const { inserted, skipped, errors } = await migratePair(db, pair);
            totalInserted += inserted;
            totalSkipped += skipped;
            totalErrors += errors;
        } catch (err) {
            console.error(`  ❌  Failed migrating ${pair.from} → ${pair.to}: ${err.message}`);
            totalErrors++;
        }
    }

    console.log('\n======================================');
    console.log(`📊  Migration Summary`);
    console.log(`    Inserted : ${totalInserted}`);
    console.log(`    Skipped  : ${totalSkipped}`);
    console.log(`    Errors   : ${totalErrors}`);
    console.log('======================================\n');

    await mongoose.connection.close();
    console.log('🔌  Disconnected from MongoDB. Done!\n');
}

main().catch(err => {
    console.error('💥  Fatal error:', err);
    process.exit(1);
});
