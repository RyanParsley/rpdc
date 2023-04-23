---
title: Solving a problem with code
description: ""
pubDate: 2013-01-02
tags:
  - Left Brain
---

I was looking for a good excuse to learn CoffeeScript so I came up with a project that takes a note and returns the blues scale in that key. It’s not a completely contrived example, I currently work this out manually using the [matrix that I posted on my music blog.](http://craftyblues.com/blog/2012/10/07/numeralCheatSheet) I thought it would be interesting to list out the process by which I solve this moderately complex problem.

## Start with thinking

Since I already do this in a manual way, I thought a bit about the steps I currently take. First, I look at my grid of notes and find the note I want to use as my root. Then, I count over to find the relevant notes that make up the rest of the scale. I figured that this was a fairly logical way to find scales, so I’d try to model my script after this. I can always change direction if this turns out not to be straight forward.

## Knock out the easy parts

Since the way you count notes is weird with sharps and flats mixed throughout, I simply copied the information from my chart into arrays like this one

`["Ab","A","Bb","B","C","Db","D","Eb","E","F","Gb”,”G”]`

Looking at that, I decided I’d like to display the notes in 4 different ways. Notes with flats, notes with sharps, and Roman numeral notation of both. Now I have this:

`numeralFlat=["I","IIb","II","IIIb","III","IV","Vb","V","VIb","VI","VIIb","VII"]
numeralSharp=["I","I#","II","II#","III","IV","IV#","V","V#","VI","VI#","VII"]
flat=["Ab","A","Bb","B","C","Db","D","Eb","E","F","Gb","G"]
sharp=["G#","A","A#","B","C","C#","D","D#","E","F","F#","G"]`

I won’t spend a lot of time on music theory, but it may help to explain that the relationship between notes in the minor blues progression is: I,IIIb, IV, Vb, V,VIIb.
That means that the blues in the key of “G” makes use of the notes G, Bb, C, Db, D and F. I decide at this point it makes sense to come up with the following variables:

`I = root
IIIb = root + 3
IV = root + 5
Vb = root + 6
V = root + 7
VIIb = root + 10`

If the numbers that I add to rootIndex don’t make sense at first, take a look at the numeralFlat listed above.

## Make a basic function

Although I’m only looking for the minor blues progression, I can easily imagine wanting to find more progressions later. Because of that, I’ll call the function “bluesScaleMinor”. It will need to take at least one argument so that the user can pass in the root note. At this point my little script looks like this:

`numeralFlat=["I","IIb","II","IIIb","III","IV","Vb","V","VIb","VI","VIIb","VII"]
numeralSharp=["I","I#","II","II#","III","IV","IV#","V","V#","VI","VI#","VII"]
flat=["Ab","A","Bb","B","C","Db","D","Eb","E","F","Gb","G"]
sharp=["G#","A","A#","B","C","C#","D","D#","E","F","F#","G"]
bluesScaleMinor = (root) ->
  I = root
  IIIb = root + 3
  IV = root + 5
  Vb = root + 6
  V = root + 7
  VIIb = root + 10
  notes = [I,IIIb, IV, Vb, V,VIIb]
console.log (bluesScaleMinor 1) `

It doesn’t handle letters or Roman numerals yet, but we’re making good progress. This will take one number then give you an array of that number plus the other 5 numbers increasing by the amounts that we want.

## Make it a little bit better

The most obvious problem with our code at this point is that it only accepts numbers. Since we have a valid list of notes in our flat array, this is pretty easy to correct with this line:

`rootIndex = flat.indexOf(root)`

Then get the notes in the scale with:

`for note, i in notes
    notes[i] = flat[note]`

This sheds light on a bit of trouble with our logic so far. If we were to use the letter “G”, we’d get [11, 14, 16, 17,18, 21]. This doesn’t work because we only have 12 notes in our array. So we need to come up with a way to force our numbers to be between 0 and 11. This is can be done simply with:

`for note, i in notes
    if note > 12
      notes[i] = note - 12`

## Mostly working code

Let’s take a look at the code we have so far.

`numeralFlat=["I","IIb","II","IIIb","III","IV","Vb","V","VIb","VI","VIIb","VII"]
numeralSharp=["I","I#","II","II#","III","IV","IV#","V","V#","VI","VI#","VII"]
flat=["Ab","A","Bb","B","C","Db","D","Eb","E","F","Gb","G"]
sharp=["G#","A","A#","B","C","C#","D","D#","E","F","F#","G"]
bluesScaleMinor = (root) ->
  rootIndex = flat.indexOf(root)
  I = rootIndex
  IIIb = rootIndex + 3
  IV = rootIndex + 5
  Vb = rootIndex + 6
  V = rootIndex + 7
  VIIb = rootIndex + 10
  notes = [I,IIIb, IV, Vb, V,VIIb]
  for note, i in notes
    if note > 12
      notes[i] = note - 12
  for note, i in notes
    notes[i] = flat[note]
console.log (bluesScaleMinor “G”)`

If we run this in the terminal, it returns exactly what we want. Success! However it could stand to be better. For instance, what if someone wants sharp notation or to simply view the Roman numeral notation? The only part of our code that forces us into flat notation is this part:

` for note, i in notes
    notes[i] = flat[note]`
Let’s cut that bit out and create four new functions like these:
` toFlat = (scale) ->
  for note, i in scale
    scale[i] = flat[note]
toSharp = (scale) ->
  for note, i in scale
    scale[i] = sharp[note]
toNumeralFlat = (scale) ->
  for note, i in scale
    scale[i] = numeralFlat[note]
toNumeralSharp = (scale) ->
  for note, i in scale
    scale[i] = numeralSharp[note]`

Now all we need is a mechanism for using the right one at the right time. A switch block makes sense to me so I make this function:

`setDisplayType = (scale, display) ->
  switch display
    when "flat" then toFlat scale
    when "sharp" then toSharp scale
    when "numeralFlat" then toNumeralFlat scale
    when "numeralSharp" then toNumeralSharp scale`

We’ll also need to add a second argument to our bluesScaleMinor function so we can pick a “display type”. A sensible default for this argument is “flat”, that’s what I want pretty much all of the time. This leaves us with the following:

`numeralFlat=["I","IIb","II","IIIb","III","IV","Vb","V","VIb","VI","VIIb","VII"]
numeralSharp=["I","I#","II","II#","III","IV","IV#","V","V#","VI","VI#","VII"]
flat=["Ab","A","Bb","B","C","Db","D","Eb","E","F","Gb","G"]
sharp=["G#","A","A#","B","C","C#","D","D#","E","F","F#","G"]
bluesScaleMinor = (root, display = "flat") ->
  rootIndex = flat.indexOf(root)
  I = rootIndex
  IIIb = rootIndex + 3
  IV = rootIndex + 5
  Vb = rootIndex + 6
  V = rootIndex + 7
  VIIb = rootIndex + 10
  notes = [I,IIIb, IV, Vb, V,VIIb]
  for note, i in notes
    if note > 12
      notes[i] = note - 12
  notes = setDisplayType notes, display
toFlat = (scale) ->
  for note, i in scale
    scale[i] = flat[note]
toSharp = (scale) ->
  for note, i in scale
    scale[i] = sharp[note]
toNumeralFlat = (scale) ->
  for note, i in scale
    scale[i] = numeralFlat[note]
toNumeralSharp = (scale) ->
  for note, i in scale
    scale[i] = numeralSharp[note]
setDisplayType = (scale, display) ->
  switch display
    when "flat" then toFlat scale
    when "sharp" then toSharp scale
    when "numeralFlat" then toNumeralFlat scale
    when "numeralSharp" then toNumeralSharp scale
console.log (bluesScaleMinor “G”)`

## One more problem with our logic

If we run this with either of the Roman numeral display types we don’t actually want them to loop around. Roman numeral notation is always relative so the root is always “I”. I’ll add a quick fix is to set the rootIndex to 0 when someone picks a Roman numeral display type. Here is our final code.

`numeralFlat=["I","IIb","II","IIIb","III","IV","Vb","V","VIb","VI","VIIb","VII"]
numeralSharp=["I","I#","II","II#","III","IV","IV#","V","V#","VI","VI#","VII"]
flat=["Ab","A","Bb","B","C","Db","D","Eb","E","F","Gb","G"]
sharp=["G#","A","A#","B","C","C#","D","D#","E","F","F#","G"]
bluesScaleMinor = (root, display = "flat") ->
  if display is "flat" or "sharp"
    rootIndex = flat.indexOf(root)
  else
    rootIndex = 0
  I = rootIndex
  IIIb = rootIndex + 3
  IV = rootIndex + 5
  Vb = rootIndex + 6
  V = rootIndex + 7
  VIIb = rootIndex + 10
  notes = [I,IIIb, IV, Vb, V,VIIb]
  for note, i in notes
    if note > 12
      notes[i] = note - 12
  notes = setDisplayType notes, display
toFlat = (scale) ->
  for note, i in scale
    scale[i] = flat[note]
toSharp = (scale) ->
  for note, i in scale
    scale[i] = sharp[note]
toNumeralFlat = (scale) ->
  for note, i in scale
    scale[i] = numeralFlat[note]
toNumeralSharp = (scale) ->
  for note, i in scale
    scale[i] = numeralSharp[note]
setDisplayType = (scale, display) ->
  switch display
    when "flat" then toFlat scale
    when "sharp" then toSharp scale
    when "numeralFlat" then toNumeralFlat scale
    when "numeralSharp" then toNumeralSharp scale
console.log (bluesScaleMinor “G”)`

That’s enough for one blog post. I’d like to finish this up and create a demo site soon. I’m only learning CoffeeScript, so I’m sure there are more elegant ways of solving this problem.
