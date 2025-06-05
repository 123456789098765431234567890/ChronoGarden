
// src/lib/firebase.ts
import { initializeApp, getApp, type FirebaseApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC3Sf6r81WojKrRUP-tmirHG9nW5Lytqvc",
  authDomain: "coderunner-9e199.firebaseapp.com",
  databaseURL: "https://coderunner-9e199-default-rtdb.firebaseio.com",
  projectId: "coderunner-9e199",
  storageBucket: "coderunner-9e199.firebasestorage.app",
  messagingSenderId: "593312008496",
  appId: "1:593312008496:web:0905d8f2143c624738e0f5",
  measurementId: "G-9FGDQVPEHX"
};

let app: FirebaseApp;

try {
  app = getApp();
} catch (e) {
  app = initializeApp(firebaseConfig);
}

const database = getDatabase(app);

export { app, database };
