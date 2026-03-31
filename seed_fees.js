import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';

// Load env from the mobile project
dotenv.config({ path: path.resolve('../innov8-mobile/.env') });

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedFees() {
  try {
    console.log("Fetching users to find a student...");
    const usersSnap = await getDocs(collection(db, 'users'));
    let studentId = null;
    let studentName = "";
    let email = "";
    let course = "";
    
    usersSnap.forEach(doc => {
      if (doc.data().role !== 'admin' && !studentId) {
        studentId = doc.id;
        studentName = doc.data().name || "Test Student";
        email = doc.data().email || "test@test.com";
        course = doc.data().course || "B.Tech";
      }
    });

    if (!studentId) {
      console.log("No student found. Using fallback ID.");
      studentId = "test_student_123";
      studentName = "Rahul Sharma";
      email = "rahul@example.com";
      course = "Full Stack Development";
    }

    console.log(`Seeding fees for student: ${studentName} (${studentId})`);

    const fees = [
      {
        studentId,
        userId: studentId, // some hooks used this, so fill both just in case
        studentName,
        email,
        course,
        description: 'Semester 1 Tuition Fee',
        amount: 50000,
        status: 'paid',
        dueDate: Timestamp.fromDate(new Date('2025-10-01')),
        paidDate: Timestamp.fromDate(new Date('2025-09-28')),
        createdAt: Timestamp.now()
      },
      {
        studentId,
        userId: studentId,
        studentName,
        email,
        course,
        description: 'Semester 2 Tuition Fee',
        amount: 50000,
        status: 'pending',
        dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
        createdAt: Timestamp.now()
      },
      {
        studentId,
        userId: studentId,
        studentName,
        email,
        course,
        description: 'Hostel Fee - Yearly',
        amount: 85000,
        status: 'overdue',
        dueDate: Timestamp.fromDate(new Date('2025-12-01')),
        createdAt: Timestamp.now()
      }
    ];

    for (const fee of fees) {
      const docRef = await addDoc(collection(db, 'fees'), fee);
      console.log(`Created fee record: ${docRef.id} - ${fee.description}`);
    }

    console.log("Successfully seeded fee records!");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding:", err);
    process.exit(1);
  }
}

seedFees();
