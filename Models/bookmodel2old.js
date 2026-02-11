const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  bookId: {
    type: String,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    required: [true, "Author is required"],
    trim: true
  },
  isbn: {
    type: String,
    trim: true
  },
  publisher: {
    type: String,
    trim: true
  },
  publishedDate: {
    type: String, // Use `Date` if you want to format/compare dates
    trim: true
  },
  accessid: {
    type: String,
    required: [true, "Access ID is required"],
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  booklanguage: {
    type: String,
    trim: true
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  libraryid: {
    type: String,
    required: [true, "Library ID is required"],
    trim: true
  },
  libraryname: {
    type: String,
    trim: true
  },
  issuedstatus:{
    type: String,
    enum:["available", "issued"],
    default: "available"
  },
  colid:{
    type: Number
  }
}, {
  timestamps: true
});

bookSchema.index({
  title: "text",
  author: "text",
  bookId: "text",
  isbn: "text",
  accessid: "text"
});


const bookmodel = mongoose.model("bookmodel2", bookSchema);
module.exports = bookmodel;
