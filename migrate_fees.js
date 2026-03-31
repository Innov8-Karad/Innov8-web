import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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
const auth = getAuth(app);

async function migrateLegacyFees() {
  try {
    console.log("Authenticating as Admin to bypass security rules...");
    await signInWithEmailAndPassword(auth, 'admin@innov8.com', 'admin123');
    console.log("Authentication successful.");
    
    console.log("Fetching all fee records...");
    const feesRef = collection(db, 'fees');
    const snapshot = await getDocs(feesRef);
    
    let updatedCount = 0;
    
    // We cannot do Promise.all blindly if there are many, but standard loops are fine
    for (const feeDoc of snapshot.docs) {
      const data = feeDoc.data();
      
      // If the document has userId but is missing studentId, this is a legacy record
      if (data.userId && !data.studentId) {
        console.log(`Migrating fee ${feeDoc.id}... setting studentId to ${data.userId}`);
        await updateDoc(doc(db, 'fees', feeDoc.id), {
          studentId: data.userId
        });
        updatedCount++;
      } else if (!data.studentId && !data.userId) {
        console.log(`Warning: Fee ${feeDoc.id} has NEITHER studentId nor userId! Skipping.`);
      }
    }

    console.log(`\nMigration complete! Successfully updated ${updatedCount} legacy fee records.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrateLegacyFees();
