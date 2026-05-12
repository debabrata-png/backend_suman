const XLSX = require('xlsx');

function toRoman(num) {
    if (isNaN(num)) return '-';
    const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let roman = '';
    for (let i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

function processAudit() {
    console.log('Reading Auditmarks (2).xlsx...');
    const workbook = XLSX.readFile('Auditmarks.xlsx');
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Read ${data.length} records. Grouping by class...`);

    const grouped = {};
    data.forEach(row => {
        const cls = row['Class'] || 'Unknown';
        if (!grouped[cls]) grouped[cls] = [];
        grouped[cls].push(row);
    });

    const outWorkbook = XLSX.utils.book_new();

    Object.keys(grouped).sort().forEach(cls => {
        const students = grouped[cls];

        // Sort by percentage descending
        students.sort((a, b) => {
            const pA = parseFloat(a['System Percentage']) || 0;
            const pB = parseFloat(b['System Percentage']) || 0;
            return pB - pA;
        });

        // Calculate Sequential Dense Rank
        let currentRank = 1;
        let rankableIndex = 0;

        const formatted = students.map((s, i) => {
            const pct = parseFloat(s['System Percentage']) || 0;
            const sysRank = s['System Rank'] || '-';
            const isFail = sysRank === '-' || (s['System Grade'] && s['System Grade'].includes('E'));

            let calcRank = '-';
            if (!isFail && pct > 0) {
                if (rankableIndex > 0) {
                    const prev = students.slice(0, i).filter(r => {
                        const rRank = r['System Rank'] || '-';
                        const rFail = rRank === '-' || (r['System Grade'] && r['System Grade'].includes('E'));
                        return !rFail && (parseFloat(r['System Percentage']) || 0) > 0;
                    }).pop();

                    if (prev && parseFloat(prev['System Percentage']) !== pct) {
                        currentRank++;
                    }
                }
                calcRank = toRoman(currentRank);
                rankableIndex++;
            }

            return {
                'Class': s['Class'],
                'Roll No': s['Roll No'],
                'Reg No': s['Reg No'],
                'Name': s['Name'],
                'Percentage': pct + '%',
                'Grade': s['System Grade'],
                'Official System Rank': sysRank,
                'Calculated Sequential Rank': calcRank,
                'Status': isFail ? 'FAIL/SKIP' : 'PASS'
            };
        });

        const ws = XLSX.utils.json_to_sheet(formatted);

        // Column widths
        const wscols = [
            { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 15 }
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(outWorkbook, ws, cls.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30));
    });

    const outPath = `Formatted_Audit_Report_Final_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(outWorkbook, outPath);
    console.log(`SUCCESS: Formatted report saved to ${outPath}`);
}

processAudit();
