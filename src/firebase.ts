import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase Web Config from the console
// You can find this in Firebase Console > Project Settings > General > Your Apps > Web App
const firebaseConfig = {
  apiKey: "AIzaSyCr5QLNS-N-Wl0aVm9grDnVkMmu9PEsEYo",
  authDomain: "sabastieh.firebaseapp.com",
  projectId: "sabastieh",
  storageBucket: "sabastieh.firebasestorage.app",
  messagingSenderId: "169771544727",
  appId: "1:169771544727:android:70717acadfe19c9f42f9d2" // Using Android ID as placeholder
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
