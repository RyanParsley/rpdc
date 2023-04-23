---
title: "CLI Driven Drupal"
categories: drupal cli composer drush
description: "It's easy to get Drupal up and running by clicking around drupal.org, downloading and extracting packages, but that's not how I do it."
pubDate: 2017-06-13 16:47:00 -0400
---

It's easy to get Drupal up and running by clicking around
http://drupal.org, downloading and extracting packages, but that's not how I do
it. Like all respectable developer tools, you can get Drupal up and
running nearly entirely from the command line. This used to be done
entirely with a tool called Drush, but now more of Drush's
responsibilities are being offloaded to the more general php tool
composer. Here's a run through of how to get a Drupal instance running
via the terminal.

## Set up your database

Before attempting to run the install script, you'll want to create a mySQL database and user with access to it.

## Set up a vhost

I'm on a Mac and tend to use the Apache that ships with the OS. As such,
I edit my vhosts like this:

```
sudo vim /etc/apache2/extra/httpd-vhosts.conf
```

```
<VirtualHost *:80>
  ServerAdmin [email goes here]
  ServerName [local url goes here (eg drupal.dev)]
  DocumentRoot [path to drupal instance]
  ErrorLog "/private/var/log/apache2/drupal.dev-error_log"
  CustomLog "/private/var/log/apache2/drupal.dev-access_log" common
  <Directory [path to drupal instance]>
    AllowOverride All
  </Directory>
</VirtualHost>
```

Be sure to change everything in square brackets to something more
appropriate for your environment, and if you use MAMP or homebrew
installed Apache, you'll need to edit a conf file in a different
location.

## Update your hosts file

```
sudo vim /etc/hosts
```

Add a new entry like:

```
127.0.0.1 drupal.dev
```

## Download Drupal core via composer

If you don't have a strong opinion about Drupal distributions, I'd
recommend using lightning as a starting point. This is a sensible
batteries included build that includes additional modules that have been
vetted by Acquia. You can install this via composer with the following
shell command.

```
composer create-project acquia/lightning-project MY_PROJECT
cd MY_PROJECT/docroot
```

## Use Drush to install the site

At this point you can visit the http://drupal.dev (or whatever local domain name you configured above) and step through the installation wizard. Or, better yet, use the following shell script to install via drush in the command line. Note that I pass flags with db, user and password below. You'll need to customize the site-install line.

```
drush site-install standard --db-url='mysql://drupalTest:drupalTest@localhost/drupal-test' --site-name=Example --account-name=ryan --account-pass=drupalTest
```

## Tweak config (hopefully optional, but I had to)

Something about my mySQL set up forced me to update the host value in `sites/default/settings.php`. I had to change `localhost` to `127.0.0.1`. Then, all was well.

## Update file permissions

```
chmod -R 777 sites/default/files
```

## May want to clear cache for good measure

Since we have to manually adjust write permission to the files directory, and that's where all sorts of theming goodness is built, you probably have broken website until the next cron job runs.

```
drush cache-rebuild
```

## Profit

Congratulations, you installed Drupal!

## Prerequisites

Here are a few tasks you'll need to do before setting up Drupal if you haven't yet.

### Install Drush

Drush is one of the killer features of drupal. Be sure to install that right away if you haven't already.

### Raise memory limit for composer

The default is 128M which was not enough. Check your limit with `php -r "echo ini_get('memory_limit').PHP_EOL;"`

#### If you haven't adjusted yours in the past, update `memory_limit` in your php.ini.

My file was found at `/usr/local/etc/php/5.6/php.ini`

If you don't know where your php.ini file is, run `php --ini`

### Set your timezone in php.ini

See above for how to locate your file, there is a `timezone` field commented out by default.
