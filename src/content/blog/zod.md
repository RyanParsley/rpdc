---
title: "Zod makes TypeScript better"
description: "Explore how Zod can complement TypeScript to provide runtime validation and enhanced type safety in your web development projects."
pubDate: 2024-08-31
updatedDate: 2024-08-31
featured: false
categories:
  - code
tags:
  - typeScript
  - zod
---

## Introduction

TypeScript can be leveraged reduce certain classes of bugs, but there are still
plenty of edges left exposed. Zod can elevate your type checking to make your
code more bug resistant. This post will explore what Zod is, why you might want
to use it alongside TypeScript, and how to integrate both into your app
effectively.

## What is Zod?

Zod is a TypeScript-first schema declaration and validation library. It enables
you to create schemas for your data structures, which can be used for
both compile-time type inference and runtime data validation.

### Key features

1. TypeScript-first approach
2. Zero dependencies
3. Compatibility with both Node.js and browser environments
4. Support for complex object shapes, including nested objects and arrays
5. Detailed error messages for invalid data

## I'm already using TypeScript, why do I need another tool!?

The two tools sound like they're addressing the same thing, but they have subtly
different strengths that complement each other. If you're skeptical about
typescript helping readability, I'd recommend [this
post](/blog/2024-08-24-fancy-types-enable-simple-code) that I recently wrote on the
subject.

1. Runtime vs. Compile-time Checking

   TypeScript performs type checking at compile-time, catching type-related
   errors before your code runs. However, it doesn't provide runtime type
   checking. Zod, on the other hand, allows you to perform validation at
   runtime, ensuring that your data conforms to the expected shape even when it
   comes from external sources like API responses or user inputs.

2. More Expressive Schemas

   While TypeScript's type system is powerful, Zod allows you to define even
   more expressive schemas. You can easily add constraints like minimum and
   maximum values, regex patterns, or custom validation logic.

3. Better Error Handling

   Zod provides detailed error messages when validation fails, making it easier
   to identify and fix issues in your data.

## Will it blend?

When introducing Zod alongside TypeScript, I was concerned about the potential
brittleness of managing two type systems. Turns out, that needn't be a problem.
Zod is designed to work seamlessly with TypeScript, and when used correctly, it
takes over as the single source of truth. So, yes, it's a new thing to learn.
However, it's not _an additional_ thing to maintain over time.

### Efficient Workflow

Here's a workflow that leverages the strengths of both TypeScript and Zod while
minimizing duplication and potential inconsistencies:

1. **Define Zod Schemas First**

   Start by defining your data structures using Zod schemas. These will serve as
   the single source of truth for your types.

   ```typescript
   import { z } from "zod";

   const UserSchema = z.object({
     id: z.number(),
     name: z.string(),
     email: z.string().email(),
     age: z.number().min(18).optional(),
   });
   ```

2. **Infer TypeScript Types from Zod Schemas**

   Next, use Zod's built-in type inference to generate TypeScript types from
   your schemas. This ensures alignment between your runtime validation and
   compile-time types.

   ```typescript
   type User = z.infer<typeof UserSchema>;
   ```

3. **Use Inferred Types in Your TypeScript Code**

   Now you can use the inferred types throughout your TypeScript code,
   benefiting from compile-time type checking.

   ```typescript
   function greetUser(user: User) {
     console.log(`Hello, ${user.name}!`);
   }
   ```

4. **Validate Data at Runtime**

   Use your Zod schemas to validate data at runtime, especially for external
   inputs.

   ```typescript
   function processUserData(data: unknown) {
     const user = UserSchema.parse(data);
     greetUser(user);
   }
   ```

5. **Extend Schemas as Needed**

   When you need to modify your data structures, update the Zod schema. The
   TypeScript types will automatically update, ensuring consistency.

   ```typescript
   const ExtendedUserSchema = UserSchema.extend({
     preferences: z.object({
       theme: z.enum(["light", "dark"]),
       notifications: z.boolean(),
     }),
   });

   type ExtendedUser = z.infer<typeof ExtendedUserSchema>;
   ```

### Benefits of This Workflow

1. **Single Source of Truth**

   Your Zod schemas define both runtime validation
   and TypeScript types, eliminating duplication.

2. **Type Safety**

   You get the compile-time benefits of TypeScript and the
   runtime safety of Zod.

3. **Flexibility**

   Zod's expressive schema definition allows for complex
   validations that TypeScript alone can't handle.

4. **Easy Maintenance**

   When you need to change your data structures, you only
   need to update the Zod schema. TypeScript types automatically stay in sync.

5. **Gradual Adoption**

   You can introduce Zod schemas gradually into an
   existing TypeScript project, starting with the most critical data structures.

By following this workflow, you can efficiently use TypeScript and Zod together,
enhancing your app's type safety without introducing unnecessary complexity or
brittleness. The key is to let Zod drive your type definitions and use
TypeScript's inference capabilities to bridge the gap between runtime and
compile-time type checking.

## Best Practices

To make the most of Zod and TypeScript in your projects, consider these best
practices and common pitfalls to avoid:

1. Define schemas as constants
2. Use .parse() for unknown data
3. Leverage Zod's built-in methods
4. Compose schemas
5. Use .extend() for inheritance
6. Utilize Zod's inference for TypeScript types

Common pitfalls to watch out for include forgetting to handle validation errors,
overusing .any() or .unknown(), neglecting runtime validation, and not taking
advantage of Zod's error customization features.

## Conclusion

Integrating Zod with TypeScript offers a powerful combination for enhancing type
safety in your web apps. As you implement this approach, you'll likely find that
the initial investment in setting up Zod schemas pays dividends in terms of code
reliability and maintainability.
