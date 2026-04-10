# Account Registration And User Discovery Review

## Your Suggestion

- Use email-based signup instead of phone-number registration.
- During signup, User A enters their simple display name first.
- After that, the user enters their email address.
- The app sends a verification code to that email.
- After entering the verification code, the user creates a password.
- Once verification is complete, the account is created.
- At account creation time, the system should generate a completely unique 10-digit user ID.
- User-to-user connection should happen through that unique ID, not through display-name search.
- This makes the app safer because anyone should not be able to search a random name and directly message that person.
- Display names can stay simple and human-friendly, but messaging access should depend on the unique ID.

## My Suggestion

- Go with email registration as the primary signup method.
- Phone number can be optional later for account recovery or extra verification, but it should not be the only way to register.
- Do not allow global "search by any name and message instantly" behavior.
- Keep `display name` and `contact identity` separate:
  - `display name`: what people see
  - `unique user ID` or `username/tag`: what people use to find/add someone
- Instead of using only a raw 10-digit number, consider a safer user handle format such as a unique app ID or username tag. Example: `rahul-4821` or `CX1045839210`.
- Messaging should happen only after one of these controlled actions:
  - a user enters the other person's unique ID
  - a user accepts a request
  - a user shares their ID/profile intentionally
- Recommended privacy system:
  - search by display name should be disabled, or heavily limited
  - search should work only by unique ID / username
  - first contact should require approval or message request acceptance
  - users should have privacy settings like `Who can message me?`
- Best safe flow:
  - signup with email verification
  - create password
  - generate unique internal user ID
  - optionally let the user choose a unique public username
  - allow discovery through public username or shared ID only
  - require approval before chat starts

## Final Recommendation

Use `email + verification + password + unique generated ID` for account creation, and do not allow free messaging through simple name search. If safety for all users is the goal, the app should separate:

- public display name
- private/internal unique account identity
- controlled messaging permission

This will be much fairer and more secure than letting anyone find a name and message them directly.
