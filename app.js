var appId = process.argv[2] || "444553118";
var pageNum = process.argv[3] || "1";
var country = process.argv[4] || "us";

var request = require("request");
var async = require("async");
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/appstore-review-notify');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("mongoose is connected");
});

var Review = require('./models/Review');




var ItunesAppReviews = require('itunes-app-reviews');
var iTunesAppReviews = new ItunesAppReviews();

// Your App ID, country, limit page number
iTunesAppReviews.getReviews(appId, country, pageNum);

// success
iTunesAppReviews.on('data', function(reviewsArr) {
  saveReviewsToDb(reviewsArr);
  // console.log(JSON.stringify(reviewsArr, null, 4));
});

// failure
iTunesAppReviews.on('error', function(err) {
  console.log(err);
});


/////
function saveReviewsToDb(reviewsArr) {
  for (var i = 0, review; i < reviewsArr.length; i++) {
    review = new Review(parseReview(reviewsArr[i]));

    review.save(function (err, review) {
      if (err) return console.error(err);
      // console.log(JSON.stringify(review, null, 4));
    });
  }
}






/////////////////////////////////////////
function getReviews(appId, pageNum, cb) {
  var reviews = [];
  var url = "https://itunes.apple.com/us/rss/customerreviews/page=" + pageNum + "/id=" + appId + "/sortBy=mostRecent/json";
  var options = {
    url: url,
    json: true
  }
  var callback = function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // console.log(body.feed.link);
      // reviewsChunks[pageNum] = body.feed.entry;
      cb(body.feed.entry);
    }
  }

  console.log("getting page " + pageNum + " of reviews for AppId: " + appId + "...");
  request(options, callback);
  // return reviews;
}

///////////////////////////////////////
function doSomethingWithReviews(reviewsArr) {

  for (var i = 1, review; i < reviewsArr.length; i++) {
    review = new Review(prettyReview(reviewsArr[i]));

    review.save(function (err, review) {
      if (err) return console.error(err);
      review.log();
    });
  }
}


//////////////////////////////////
function insertReview(reviewObj) {
  var review = new Review(reviewObj);

  review.save(function (err, review) {
    if (err) return console.error(err);
    review.log();
  });
}

///////////////////////////////
function parseReview(review) {
  console.log(review);
  return {
    updated: new Date(review.updated),
    reviewId: review.id,
    title: review.title,
    text: review.content[0]["_"],
    htmlString: review.content[1]["_"],
    rating: +review["im:rating"][0],
    version: +review["im:version"][0],
    author: review.author[0].name[0],
    uri: review.author[0].uri[0]
  }
}

// ///////////////////////////////
// function prettyReview(review) {
//   return {
//     reviewId: review["id"]["label"],
//     name: review["author"]["name"]["label"],
//     rating: review["im:rating"]["label"],
//     title: review["title"]["label"],
//     text: review["content"]["label"],
//     version: review["im:version"]["label"],
//     date: Date.now
//   }
// }

//////////////
function prettyReviews(reviewsArr) {
    var reviewObjArr = [];

  for (var i = 1; i < reviewsArr.length; i++) {
    reviewObjArr.push({
      reviewId: reviewsArr[i]["id"]["label"],
      name: reviewsArr[i]["author"]["name"]["label"],
      rating: reviewsArr[i]["im:rating"]["label"],
      title: reviewsArr[i]["title"]["label"],
      text: reviewsArr[i]["content"]["label"],
      version: reviewsArr[i]["im:version"]["label"],
      date: Date.now
    });
  }

  return reviewObjArr;
}

////////////////////////////////////////
// function getAllReviews(appId) {
//   var currentPage = 1;
//   var lastPage = getLastPageNum(appId);

//   while (currentPage <= lastPage) {
//     currentBatch = getReviews(appId, currentPage);
//     for (var i = 0; i < currentBatch.length; i++) {
//       reviewArr.push(currentBatch[i]);
//     }
//     currentPage++;
//   }
//   return reviews;
// }

// ////////////////////////////////
// function getLastPageNum(appId) {
//   var lastPageUrl;

//   var numStrArr = [];

//   var url = "https://itunes.apple.com/us/rss/customerreviews/page=1/id=" + appId + "/sortBy=mostRecent/json";
//   var options = {
//     url: url,
//     json: true
//   };
//   var callback = function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//       linkArr = body.feed.link;

//       for (var i = 0, j = 0; i < linkArr.length; i++) {
//         if (linkArr[i].attributes.rel === "last") {
//           lastPageUrl = linkArr[i].attributes.href;
//           while (!isNaN(+lastPageUrl[53 + j])) {
//             numStrArr.push(lastPageUrl[53 + j]);
//             j++;
//           }
//           rn.lastPageNum = +numStrArr.join('');
//           console.log("Done. Last page is " + rn.lastPageNum); //TODO: how can I return this value from the outide function?
//           doSomethingWithLastPageNum

//         }
//       }
//     }
//   }

//   console.log("getting lastPageNum for AppId: " + appId + "...");
//   request(options, callback);
// }


// ///////////////////////////////
// function waitOnLastPageNum() {
//   console.log("waiting");
//   if (rn.lastPageNum > 0) {
//     return lastPageNum;
//   } else {
//     setTimeout(waitOnLastPageNum, 1000);
//   }
// }
