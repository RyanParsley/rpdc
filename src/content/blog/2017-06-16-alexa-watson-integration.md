---
title: Alexa Watson integration
categories: node cli watson nlp alexa
description: Here are notes from building a proof of concept around integrating Watson Retrieve and Rank service into an Alexa skill.
pubDate: 2017-06-16 16:47:00 -0400
---

Here are notes from building a proof of concept around integrating Watson Retrieve and Rank service into an Alexa skill. I'm still learning, so this may not be the best way to do it. This is simply an approach that worked for me. I'm hoping this overview will illustrate how simple it can be to leverage these two complicated sounding platforms together. If I can sort it out, surely someone as clever as yourself can too.

## Retrieve and Rank

You can sign up for a free bluemix account. I'm not sure the terms or pricing as I used credentials provided by work. You can definitely kick the tires for free, but I'm not sure how far you can get with that. The underlying technology is really impressive, but the web interface and general user experience need some love. IBM has great [documentation](https://www.ibm.com/watson/developercloud/doc/retrieve-rank/ranker_tooling.html) that walks you through the training process, but I'll provide a high level overview. Check out the official [documentation](https://www.ibm.com/watson/developercloud/doc/retrieve-rank/ranker_tooling.html) when you're setting up the service for yourself.

### Create a Cluster

This dubiously named step fires up a solr instance to which you'll upload documents. You can upload a variety of formats to the `Documents` tab that will be used as source material to answer questions. By default, html documents are broken up into something called "Answer Units" based on the placement of Header tags. So, if you have non-semantic html, your milage will vary. Also, the more content you have between header tags, the more verbose your answer will be. You probably want your answer to be fairly terse since they will ultimately be consumed via a robotic voice.

In the `Questions` tab you can upload a plain text list of training questions. After some questions have been uploaded, this tab will also be used to pair questions with relavant "Answer Units" in the uploaded documents. As I understand it, before training, you get solr responses. Then, you rate the answers on a 4 star rating which adds some meta data to enhance the search results.

## Simple node.js CLI

Now that my data was trained, I wanted to test it in the simplest way possible. So I built a tiny node.js app to hit the service from my command line. IBM released a [node module](https://www.npmjs.com/package/watson-developer-cloud) that enabled me to do this in about 20 lines of code.

```
var RetrieveAndRankV1 = require('watson-developer-cloud/retrieve-and-rank/v1');

var retrieve = new RetrieveAndRankV1({
  username: '',
  password: '',
});

var solrClient = retrieve.createSolrClient({
  cluster\\\_id: '',
  collection\\\_name: ''
});

// search all documents
var query = solrClient.createQuery();
query.q(process.argv[2]);

solrClient.search(query, function(err, searchResponse) {
  if(err) {
    console.log('Error searching for documents: ' + err);
  } else {
    console.log("The best answer I have to: ", process.argv[2]);
    console.log(JSON.stringify(searchResponse.response.docs[0].body, null, 2));
  }
});
```

With that I could fire off requests via `node index.js "How many cups of sugar does it take to get to the moon?"` and Watson's answers would print to the command line.

## Alexa Skill

Armed with the ego boost of a successful HelloWorld, I converted that CLI into a module like so:

```
var RetrieveAndRankV1 = require('watson-developer-cloud/retrieve-and-rank/v1');

var retrieve = new RetrieveAndRankV1({
  username: '',
  password: '',
});

var solrClient = retrieve.createSolrClient({
  cluster\\\_id: '',
  collection\\\_name: ''
});

function watsonHelper() {
}

watsonHelper.prototype.query = function(question) {
  // search all documents
  var query = solrClient.createQuery();
  query.q(question);

  solrClient.search(query, function(err, searchResponse) {
    if(err) {
      console.log('Error searching for documents: ' + err);
      return '';
    } else {
      console.log(JSON.stringify(searchResponse.response.docs[0].body, null, 2));
    }
  }).then(function(){
    return JSON.stringify(searchResponse.response.docs[0].body, null, 2);
  });
};
module.exports = watsonHelper;
```

I then required that helper in an Alexa app heavily based on based on a template app [provided by the Alexa team](https://github.com/alexa/).

```
'use strict';
var \\\_ = require('lodash');
var Alexa = require('alexa-app');
var app = new Alexa.app('NameOfYourSkill');
var WatsonHelper = require('./watson\\\_helper');

app.launch(function(req, res) {
  var prompt = 'Ask me questions, I'll answer them from the Cloud.';
  res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

app.intent('askQuestion', {
  'slots': {
    'QUESTION': 'QUESTION\\\_LIST'
  },
  'utterances': ['{QUESTION}']
},
function(req, res) {
  //get the slot
  var question = req.slot('QUESTION');
  var reprompt = 'Sorry, not an instant win! Please try again.';

  if (\\\_.isEmpty(question)) {
    var prompt = 'I didn\\\\'t hear a question that I know. Please ask differently.';
    res.say(prompt).reprompt(reprompt).shouldEndSession(false);
    return true;
  } else {
    var watsonHelper = new WatsonHelper();
    var answer = watsonHelper.query(question);
    res.say(answer).send();
  }
});

//hack to support custom utterances in utterance expansion string
console.log(app.utterances().replace(/\\\\{\\\\-\\\\|/g, '{'));
module.exports = app;
```

I uploaded that to [lambda](http://docs.aws.amazon.com/lambda/latest/dg/welcome.html) and went through the alexa configuration wizards and all was well.

### Custom Slots and Utterances

Since Watson would be doing all the heavy lifting, I only have one utterance. The utterance is about as simple as they come, I pass the whole user string as `QUESTION`.

```
askQuestion {QUESTION}
```

Since I had a list of plain text answers hanging out that were used to train watson, I pasted this list into a Custom Slot of Type `QUESTION\\\_LIST`. A clever coworker commented that this is an optional step, but considering the list is already compiled, I used it. Custom slots can help Alexa sort out speech to text ambiguity like homonyms and poor enunciation.

## That wasn't so bad

That's really all there is to it. There's not a lot of custom code needed for an app like this because most of the really impressive bits are handled via Amazon and IBM. All you have to do is wire it up with a little javascript that should look mostly familiar.

## Caveat

This proof of concept started out with the hope that we could dump existing documentation into the Watson's service and we'd get instant robot tech support. This did not happen for 2 main reasons, both related to the source material.

### Semantic markup

The documentation html that I received didn't make use of header tags as you'd want. It was a funky custom accordion with divs and custom classes. Since these custom classes didn't reveal any hierarchy, I opted to update the markup with appropriate header tags.

### Verbose answers drag on in robot voice

Bear in mind that since "Answer units" are delineated by header tags, an answer is as long as all the text between header tags. In my sample data, some answers were acceptable, and other felt to drag on for an eternity. These answers were correct, but this is not a great user experience.
