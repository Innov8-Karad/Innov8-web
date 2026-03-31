import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDyF1Zhz8hAbSlKyO6B_BgtFsYYIo91Abk",
  authDomain: "innov8-karad.firebaseapp.com",
  projectId: "innov8-karad",
  storageBucket: "innov8-karad.firebasestorage.app",
  messagingSenderId: "782964169785",
  appId: "1:782964169785:web:09ec938c0033337daa81e8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPlacements() {
    try {
        console.log("Checking placements...");
        const q = query(collection(db, 'placements'), limit(5));
        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.docs.length} placements`);
        snapshot.forEach(doc => {
            console.log(doc.id, JSON.stringify(doc.data(), null, 2));
        });
    } catch (err) {
        console.error("Error checking placements:", err);
    }
}

checkPlacements();
