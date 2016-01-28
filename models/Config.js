var mongoose = require('mongoose');

var configSchema = mongoose.Schema({
  updated: Date
});

// var reviewSchema = mongoose.Schema({
//   reviewId: Number,
//   name: String,
//   rating: Number,
//   title: String,
//   text: {type: String, index: true},
//   version: Number,
//   date: { type: Date, default: Date.now }
// });

// var reviewSchema = mongoose.Schema({
//   updated: [ String ],
//   id: [ String ],
//   title: [ String ],
//   content: [ Array, Array ],
//   'im:contentType': [ Array ],
//   'im:voteSum': [ String ],
//   'im:voteCount': [ String ],
//   'im:rating': [ String ],
//   'im:version': [ String ],
//   author: [ Array ],
//   link: [ Array ]
// });

// reviewSchema.methods.log = function () {
//   console.log("reviewId: " + this.reviewId);
//   console.log("name: " + this.name);
//   console.log("rating: " + this.rating);
//   console.log("title: " + this.title);
//   console.log("text: " + this.text);
//   console.log("version: " + this.version);
//   console.log("date: " + this.date);
// }

module.exports = mongoose.model('Config', configSchema);
