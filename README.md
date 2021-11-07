# 💸 Moni App 💸

(Readme in progress ...)

### 🙋 Do you want to have your own version of Moni?

Well, it's possible, but nothing comes free, you will have to work (a little).

#### 💡 Prerequities

You must know Firebase backend (Auth / Firestore / Functions / FCM) and React Native to host your own version of Moni. Unknow stack ? Open google, stackoverflow and your favorite IDE, and start playing with these cool technologies.

#### 🖥️ Backend

Initialize a new firebase project :

- Generate google configuration files for iOS and Android
- Auhtorize authentication for desired auth 3rd parties
- For each auth methods, follow instruction (Apple, Twitter, ...)
- Copy firestore rules into your firestore configuration
- Turn on and configure FCM for iOS and Android (if you want to send notifications)

#### 📱 App

Start a new RN project from scratch using the same package ID used in firebase project

- Copy dependancies from package.json and follow instructions on each repo website
- Copy source code from src folder to your newly created project
- Use `pnx pod-install` on iOS to install dependancies
- Copy firebase configuration files for iOS and Android
- If you plan to use Twitter or other 3rd parties authentication provider, update conf/Configuration.ts

#### 💾 Add data

Work in progress, but just look at how data are created in the models (Instrument Object), and insert a list of Instrument in firestore collection.

```
[
	{
    "id": "STLA.PA",
    "sy": "STLA",
    "pd": 3,
    "li": {
      "t": 0,
    },
    "na": "STELLANTIS NV",
    "mk": "XPAR",
    "in": {
      "t": 0,
    },
    "isin": "NL00150001Q9",
    "ty": "equity"
  },
  ...
]
```

#### Have fun

Reach me on Twitter if you have any question, I'll my best to help you :)
