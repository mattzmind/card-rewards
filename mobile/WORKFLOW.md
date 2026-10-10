# Lucro: shipping workflow cheat sheet

## 1. Giving it to friends on TestFlight

**External testing is the easy route for friends.** Anyone with an email address can join, up to 10,000 people.

1. **Fill in test info first.** In App Store Connect, go to TestFlight → **Test Information** (bottom left). Add a feedback email, a short "what to test" note, and a privacy policy URL.
2. **Create a group.** Next to **External Testing**, click **+** and name it something like "Friends".
3. **Add the build.** Open the group, go to Builds, click **+**, and pick the latest build (e.g. **1.0.0 (4)**).
4. **Wait for Apple's beta review.** The first build of each version gets a light review, usually under a day. Later builds of the same version are often approved right away.
5. **Invite people.** Once it's approved, either:
   - **Add testers by email.** They get an invite email, or
   - **Turn on a Public Link** and text it to them. This is easiest because there's no need to collect emails.
6. **On their side,** friends install the free **TestFlight** app from the App Store, tap your link or invite, then tap Install.

The other option is **Internal Testing**, like the "ME" group. It skips review, but every tester must be added as a user on your App Store Connect account. That's fine for a spouse, but it's awkward for friends.

## 2. Claude Code on your phone

There are two ways:

- **Claude Code in the cloud (best for working away from the PC).**
  - Open the **Claude app** on your phone (or claude.ai/code in Safari) and go to **Code**.
  - Connect your GitHub account and pick the `mattzmind/card-rewards` repo.
  - Claude works in a cloud copy of the repo and pushes its changes to a branch. You review and merge from your phone or later.
  - This only sees what's on GitHub, so **push first**.
- **Remote Control (steer the PC from your phone).**
  - Your computer stays on with Claude Code running.
  - In a session, run `/remote-control`, and then you can continue that session from the Claude app.
  - It uses your local files and tools directly, but the PC must stay awake.

One limit applies either way: building and installing on a phone needs EAS, which runs on your PC. A cloud session can write the code. You then start the TestFlight build when you're back, unless automatic builds on push are set up.

## 3. Your workflow: from VS Code to TestFlight

There are fewer steps than it looks. You only touch 3 of the 6 tools in a normal loop:

```
 1. Code      VS Code + Claude Code     change files in mobile/
 2. Try it    npx expo start            see it live on your phone (Expo Go or dev build)
 3. Save      git commit + push         record it on GitHub
 4. Ship      eas build --auto-submit   one command: build in the cloud → upload to Apple
 5. Test      TestFlight on phones      update appears ~20–40 min later
```

The ship command, run inside `mobile/`:

```
npx eas-cli build --profile production --platform ios --auto-submit
```

After that, it all happens on its own:
- EAS raises the build number, builds the app in Expo's cloud and uploads it to App Store Connect.
- Apple processes it, and it shows up in TestFlight.
- Your internal group gets it automatically. For the friends group, add the new build to the group (step 3 in section 1).

For the App Store itself, attach the build to a version and click Add for Review. You only do that for real releases.

## 4. What each platform is

| Tool | What it is | Your use |
|---|---|---|
| **VS Code** | The code editor on your PC, with Claude Code inside it | Where all changes are made |
| **Expo Go** | A ready-made app from the App Store that runs your code live while you develop | Quick previews over Wi‑Fi. It can only use features that are built into Expo Go. |
| **Development build** | Your own version of "Expo Go", made specifically for Lucro (build #1) | Same live previews, plus any native features you add later, like widgets and location |
| **EAS (Expo Application Services)** | Expo's cloud build service. It turns your code into a real signed iPhone app, with no Mac needed. | Making the app files and sending them to Apple |
| **expo.dev** | The website for your EAS account | Viewing build history and logs, and checking whether a build failed |
| **App Store Connect** | Apple's control panel for your app | Store listing, screenshots, privacy answers, review submission, testers |
| **TestFlight** | Apple's beta-testing system: a tab inside App Store Connect plus an app on testers' phones | Getting builds onto your phone and friends' phones before public release |

**How they connect:**

```
VS Code ──(npx expo start)──▶ Expo Go / dev build on your phone    ← daily development
   │
   └─(eas build)──▶ EAS cloud ──(auto-submit)──▶ App Store Connect
                    (logs on expo.dev)                 │
                                       ┌───────────────┴──────────────┐
                                       ▼                              ▼
                                  TestFlight                      App Store
                              (you + friends, beta)         (public, after review)
```

In short, development happens in the top row. You only go down the EAS path when you want testers or the public to get a new version.

## Later upgrades
- **Automatic TestFlight builds:** every push to `main` builds and uploads a new version, so you can ship from your phone.
- **Over-the-air updates (EAS Update):** small code-only fixes reach testers in seconds without a new build or Apple processing.
