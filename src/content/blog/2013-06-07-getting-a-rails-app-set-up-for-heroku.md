---
title: Getting a Rails app set up for Heroku
description: ""
pubDate: 2013-06-07
tags:
  - Left Brain
---

I find myself daisy chaining a few blog posts together to get up and running with Rails. Here are the steps that I took most recently to deploy to Heroku.

## Initial setup

Create your app.

```
rails new [appName] -d postgresql
git init
git add .
git commit -m "initial commit"
```

Make help Pow and RVM play nice together.

```
rvm env -- `rvm current` > .powenvmk
```

Create your databases locally.

```
psql
CREATE DATABASE [appName_environment]
\q
```

Add the Sass version of Bootstrap and follow the instructions at https://github.com/thomas-mcdonald/bootstrap-sass.

```
gem 'bootstrap-sass', '~> 2.3.1.3'
```

## Create your first resource

Generate the scaffold and set up your database.

```
rails g scaffold [resourceName] title:string body:text
rake db:create
rake db:migrate
```

Set up your default route (/config/routes.rb).

```
root to: 'newsletters#index'
```

Remove "/public/index.html".

## Make Heroku happy.

Change this in "/config/application.rb"

```
config.assets.initialize_on_precompile=false
```

Change this in "/config/environments/production.rb".

```
config.assets.compile = true
```

Create the heroku project.

```
heroku apps:create [app-name]
git add .
git commit -m "Ready for heroku"
git push heroku master
```

## Piece of cake!

That should yield a good jumping off place for most apps. Don't forget to duplicate the Heroku create steps for a staging environment. You'll thank me later.
