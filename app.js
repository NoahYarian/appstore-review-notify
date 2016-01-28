var smtpUser = process.argv[2];
var smtpPass = process.argv[3];
var appId = process.argv[4] || "444553118";
var pageNum = process.argv[5] || "1";
var country = process.argv[6] || "us";

var request = require("request");
var async = require("async");
var mongoose = require('mongoose');
var nodemailer = require('nodemailer');

var Review = require('./models/Review');
var Config = require('./models/Config');

var localCopy = [];
var localConfig;
var report,
    lastUpdated;

// per-user mailing
// if this runs every 5 minutes, how can this get the last updated time?

// var config = new Config();

//   config
//     .save(function (err, review, numAffected) {
//       if (err) return console.error(err);
//     })
//     .then(function() {

//     });



// set up nodemailer
////////////////////
var transportOptions = {
  host: 'smtp.zoho.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
}

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport(transportOptions);



// set up Mongoose
//////////////////
mongoose.connect('mongodb://localhost:27017/appstore-review-notify');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("mongoose is connected");

  // lastUpdated = mongoose.get('updated');
  // console.log("lastUpdated: ", lastUpdated);

  Config.find(function (err, configs) {
    if (err) return console.error(err);
    if (configs.length === 0) {
      console.log("configs.length === 0");
      var freshConfig = new Config({'updated': new Date(0)});

      freshConfig
        .save(function (err, freshConfig, numAffected) {
          if (err) return console.error(err);
        })
        .then(function() {
          localConfig = freshConfig;
          configIsLoaded();
        });
    } else {
      console.log("configs: ", configs);
      localConfig = configs[configs.length-1];
      configIsLoaded();
    }
  });
});

function configIsLoaded() {

  lastUpdated = localConfig.updated;
  console.log("lastUpdated: ", lastUpdated);
}



// get app reviews
//////////////////
var ItunesAppReviews = require('itunes-app-reviews');
var iTunesAppReviews = new ItunesAppReviews();

// Your App ID, country, limit page number
iTunesAppReviews.getReviews(appId, country, pageNum);

// success
iTunesAppReviews.on('data', function(reviewsArr) {
  var filteredReviewsArr = iTunesAppReviews.filterByVersion(reviewsArr, '1.7');
  report = iTunesAppReviews.report(filteredReviewsArr);

  var dateFilteredArr = [];
  // var lastUpdated = new Date('2016-01-25 7:10:00 PM').getTime();
  console.log("lastUpdated: ", lastUpdated);

  for (var i = 0, review, date; i < filteredReviewsArr.length; i++) {
    review = filteredReviewsArr[i];
    console.log(review.updated);
    date = new Date(review.updated[0]).getTime();
    if (date > lastUpdated) {
      console.log('push it!');
      dateFilteredArr.push(review);
    }
  }
  console.log("dateFilteredArr: ", dateFilteredArr);
  saveReviewsToDb(dateFilteredArr);
});

// failure
iTunesAppReviews.on('error', function(err) {
  console.log(err);
});



// send emails
//////////////
function emailNoah(reviews) {
  var messageText = 'Hello!\n';
  messageText += 'There are ' + reviews.length + ' reviews here for you:\n\n';
  messageText += report;

  // var messageHtml = '';

  // for (var i = 0; i < reviews.length; i++) {
  //   messageHtml += reviews[i].htmlString;
  // }

  // setup e-mail data with unicode symbols
  var mailOptions = {
      from: 'Yo Momma 💋 <Noah@NoahYarian.com>', // sender address
      to: 'noah@noahyarian.com', // list of receivers
      subject: 'Hello ✔', // Subject line
      text: messageText // plaintext body
  };

  // console.log('totally could have sent this email:');
  // console.log('text: ', messageText);
  // console.log('html: ', messageHtml);

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(error, info){
      if(error){
          return console.log(error);
      }
      console.log('Message sent: ' + info.response);
  });
}

function afterSavingAllToDb() {
  console.log('done saving reviews to DB');
  console.log(localConfig);

  var freshConfig = new Config({'updated': new Date()});

  freshConfig
    .save(function (err, localConfig, numAffected) {
      if (err) return console.error(err);
    })
    .then(function() {
      console.log('done saving config to DB');
    });

  emailNoah(localCopy);
}

function afterSavingEachToDb() {
  // console.log("no error when saving review to DB");
  // for (var i = 0, review; i < localCopy.length; i++) {
  //   review = localCopy[i];
    // if (review.updated.getTime() > lastUpdated.getTime()) {
    //   //email me!
    //   emailNoah(review);
    // }
  // }

}


/////
function saveReviewsToDb(reviewsArr) {
  var saveCount = 0,
      totalCount = reviewsArr.length;

  for (var i = 0, review; i < reviewsArr.length; i++) {
    review = new Review(parseReview(reviewsArr[i]));
    localCopy.push(review);

    review
      .save(function (err, review, numAffected) {
        if (err) return console.error(err);
      })
      .then(function() {
        afterSavingEachToDb();
        saveCount++;
        // console.log("I'm number " + saveCount);
        if (saveCount === totalCount) {
          // console.log("I'm last!");
          afterSavingAllToDb();
        }
      });
  }

}

///////////////////////////////
function parseReview(review) {
  // console.log(review);
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












// /////////////////////////////////////////
// function getReviews(appId, pageNum, cb) {
//   var reviews = [];
//   var url = "https://itunes.apple.com/us/rss/customerreviews/page=" + pageNum + "/id=" + appId + "/sortBy=mostRecent/json";
//   var options = {
//     url: url,
//     json: true
//   }
//   var callback = function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//       // console.log(body.feed.link);
//       // reviewsChunks[pageNum] = body.feed.entry;
//       cb(body.feed.entry);
//     }
//   }

//   console.log("getting page " + pageNum + " of reviews for AppId: " + appId + "...");
//   request(options, callback);
//   // return reviews;
// }

// ///////////////////////////////////////
// function doSomethingWithReviews(reviewsArr) {

//   for (var i = 1, review; i < reviewsArr.length; i++) {
//     review = new Review(prettyReview(reviewsArr[i]));

//     review.save(function (err, review) {
//       if (err) return console.error(err);
//       review.log();
//     });
//   }
// }


// //////////////////////////////////
// function insertReview(reviewObj) {
//   var review = new Review(reviewObj);

//   review.save(function (err, review) {
//     if (err) return console.error(err);
//     review.log();
//   });
// }



// // ///////////////////////////////
// // function prettyReview(review) {
// //   return {
// //     reviewId: review["id"]["label"],
// //     name: review["author"]["name"]["label"],
// //     rating: review["im:rating"]["label"],
// //     title: review["title"]["label"],
// //     text: review["content"]["label"],
// //     version: review["im:version"]["label"],
// //     date: Date.now
// //   }
// // }

// //////////////
// function prettyReviews(reviewsArr) {
//     var reviewObjArr = [];

//   for (var i = 1; i < reviewsArr.length; i++) {
//     reviewObjArr.push({
//       reviewId: reviewsArr[i]["id"]["label"],
//       name: reviewsArr[i]["author"]["name"]["label"],
//       rating: reviewsArr[i]["im:rating"]["label"],
//       title: reviewsArr[i]["title"]["label"],
//       text: reviewsArr[i]["content"]["label"],
//       version: reviewsArr[i]["im:version"]["label"],
//       date: Date.now
//     });
//   }

//   return reviewObjArr;
// }

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
