// Firebase Admin Seed Script
// Run with: node scripts/seed.mjs
// This creates an admin user and seeds all Firestore collections

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyB8n6fzFk0A4S7H72qLjYa3LifVyrzGgSo",
    authDomain: "innov8-cde79.firebaseapp.com",
    projectId: "innov8-cde79",
    storageBucket: "innov8-cde79.firebasestorage.app",
    messagingSenderId: "916821936768",
    appId: "1:916821936768:web:e32603580cdfcb00537465"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
    console.log("🚀 Starting Firebase seed...\n");

    // ═══════════════════════════════════════════
    // 1. CREATE ADMIN USER
    // ═══════════════════════════════════════════
    console.log("👤 Creating admin user...");
    try {
        const adminCred = await createUserWithEmailAndPassword(auth, "admin@innova8.com", "Admin@123");
        const adminUid = adminCred.user.uid;
        console.log(`   ✅ Admin created: admin@innova8.com / Admin@123 (UID: ${adminUid})`);

        // Save admin profile to users collection
        await setDoc(doc(db, "users", adminUid), {
            email: "admin@innova8.com",
            name: "Admin",
            phone: "9999999999",
            batch: "ADMIN",
            course: "ADMIN",
            enrollmentDate: Timestamp.now(),
            skills: [],
            createdAt: Timestamp.now(),
            role: "admin"
        });
        console.log("   ✅ Admin profile saved to Firestore\n");
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            console.log("   ⚠️ Admin user already exists, skipping...\n");
        } else {
            console.error("   ❌ Error creating admin:", err.message);
        }
    }

    // ═══════════════════════════════════════════
    // 2. SEED SAMPLE STUDENTS (users)
    // ═══════════════════════════════════════════
    console.log("👥 Seeding sample students...");
    const students = [
        { id: "student1", email: "9876543210@innova8.example.com", name: "Aarav Patel", phone: "9876543210", batch: "2024-A", course: "DSA", skills: ["Java", "Python", "Data Structures"] },
        { id: "student2", email: "9876543211@innova8.example.com", name: "Priya Sharma", phone: "9876543211", batch: "2025", course: "Full Stack", skills: ["React", "Node.js", "MongoDB"] },
        { id: "student3", email: "9876543212@innova8.example.com", name: "Rohan Gupta", phone: "9876543212", batch: "2024-B", course: "DSA", skills: ["C++", "Algorithms"] },
        { id: "student4", email: "9876543213@innova8.example.com", name: "Ananya Singh", phone: "9876543213", batch: "2024-A", course: "Web Development", skills: ["HTML", "CSS", "JavaScript"] },
        { id: "student5", email: "9876543214@innova8.example.com", name: "Vikram Reddy", phone: "9876543214", batch: "2025", course: "Machine Learning", skills: ["Python", "TensorFlow"] },
    ];

    for (const s of students) {
        await setDoc(doc(db, "users", s.id), {
            email: s.email,
            name: s.name,
            phone: s.phone,
            batch: s.batch,
            course: s.course,
            enrollmentDate: Timestamp.fromDate(new Date("2024-01-15")),
            skills: s.skills,
            createdAt: Timestamp.fromDate(new Date("2024-01-15")),
        });
    }
    console.log(`   ✅ ${students.length} students created\n`);

    // ═══════════════════════════════════════════
    // 3. SEED FEES
    // ═══════════════════════════════════════════
    console.log("💰 Seeding fees...");
    const fees = [
        { userId: "student1", amount: 25000, status: "paid", description: "DSA Course - Semester 1", dueDate: new Date("2024-02-01"), paidDate: new Date("2024-01-28") },
        { userId: "student1", amount: 25000, status: "pending", description: "DSA Course - Semester 2", dueDate: new Date("2024-08-01") },
        { userId: "student2", amount: 35000, status: "paid", description: "Full Stack Course - Semester 1", dueDate: new Date("2024-03-01"), paidDate: new Date("2024-02-25") },
        { userId: "student3", amount: 25000, status: "overdue", description: "DSA Course - Semester 1", dueDate: new Date("2024-02-01") },
        { userId: "student4", amount: 20000, status: "paid", description: "Web Dev Course - Term 1", dueDate: new Date("2024-02-15"), paidDate: new Date("2024-02-10") },
        { userId: "student5", amount: 40000, status: "pending", description: "ML Course - Full", dueDate: new Date("2024-04-01") },
    ];

    for (const f of fees) {
        await addDoc(collection(db, "fees"), {
            userId: f.userId,
            amount: f.amount,
            status: f.status,
            description: f.description,
            dueDate: Timestamp.fromDate(f.dueDate),
            ...(f.paidDate ? { paidDate: Timestamp.fromDate(f.paidDate) } : {}),
        });
    }
    console.log(`   ✅ ${fees.length} fee records created\n`);

    // ═══════════════════════════════════════════
    // 4. SEED EXAMS
    // ═══════════════════════════════════════════
    console.log("📝 Seeding exams...");
    const exams = [
        {
            title: "DSA Fundamentals",
            description: "Test your understanding of basic data structures and algorithms",
            duration: 60,
            totalMarks: 100,
            scheduledDate: Timestamp.fromDate(new Date("2024-03-15T10:00:00")),
            category: "DSA",
            difficulty: "easy",
            questions: [
                { id: "q1", text: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], correctAnswer: 1, explanation: "Binary search divides the search space in half each time." },
                { id: "q2", text: "Which data structure uses FIFO?", options: ["Stack", "Queue", "Tree", "Graph"], correctAnswer: 1, explanation: "Queue follows First In First Out principle." },
                { id: "q3", text: "What is the worst-case time complexity of QuickSort?", options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"], correctAnswer: 2, explanation: "QuickSort has O(n²) worst case when pivot selection is poor." },
            ]
        },
        {
            title: "Advanced Algorithms",
            description: "Test on dynamic programming, graph algorithms, and advanced topics",
            duration: 90,
            totalMarks: 150,
            scheduledDate: Timestamp.fromDate(new Date("2024-04-20T14:00:00")),
            category: "DSA",
            difficulty: "hard",
            questions: [
                { id: "q1", text: "Which algorithm is used for shortest path in weighted graphs?", options: ["BFS", "DFS", "Dijkstra's", "Prim's"], correctAnswer: 2, explanation: "Dijkstra's algorithm finds shortest paths in weighted graphs." },
                { id: "q2", text: "What is the time complexity of merge sort?", options: ["O(n²)", "O(n log n)", "O(n)", "O(log n)"], correctAnswer: 1, explanation: "Merge sort always runs in O(n log n)." },
            ]
        },
        {
            title: "React Basics",
            description: "Fundamentals of React including JSX, components, and hooks",
            duration: 45,
            totalMarks: 50,
            scheduledDate: Timestamp.fromDate(new Date("2024-05-10T11:00:00")),
            category: "Web Development",
            difficulty: "medium",
            questions: [
                { id: "q1", text: "What hook is used for side effects in React?", options: ["useState", "useEffect", "useRef", "useMemo"], correctAnswer: 1, explanation: "useEffect manages side effects like API calls and subscriptions." },
                { id: "q2", text: "JSX stands for?", options: ["JavaScript XML", "Java Syntax Extension", "JSON XML", "JavaScript Extension"], correctAnswer: 0, explanation: "JSX stands for JavaScript XML." },
            ]
        }
    ];

    for (const e of exams) {
        await addDoc(collection(db, "exams"), e);
    }
    console.log(`   ✅ ${exams.length} exams created\n`);

    // ═══════════════════════════════════════════
    // 5. SEED COURSES
    // ═══════════════════════════════════════════
    console.log("📚 Seeding courses...");
    const courses = [
        { title: "Data Structures & Algorithms", description: "Master DSA from basics to advanced with hands-on problems", price: 25000, isFree: false, duration: "6 months", instructor: "Prof. Rajesh Kumar", rating: 4.8, enrolled: 156 },
        { title: "Full Stack Web Development", description: "Learn MERN stack: MongoDB, Express, React, Node.js", price: 35000, isFree: false, duration: "8 months", instructor: "Prof. Meera Joshi", rating: 4.6, enrolled: 98 },
        { title: "Machine Learning Fundamentals", description: "Introduction to ML with Python, scikit-learn and TensorFlow", price: 40000, isFree: false, duration: "6 months", instructor: "Dr. Anil Verma", rating: 4.9, enrolled: 72 },
        { title: "Web Development Basics", description: "HTML, CSS, JavaScript fundamentals for beginners", price: 0, isFree: true, duration: "3 months", instructor: "Prof. Sneha Kapoor", rating: 4.5, enrolled: 320 },
        { title: "Python Programming", description: "Complete Python course from zero to hero", price: 0, isFree: true, duration: "2 months", instructor: "Prof. Rajesh Kumar", rating: 4.7, enrolled: 450 },
    ];

    for (const c of courses) {
        await addDoc(collection(db, "courses"), c);
    }
    console.log(`   ✅ ${courses.length} courses created\n`);

    // ═══════════════════════════════════════════
    // 6. SEED ANNOUNCEMENTS
    // ═══════════════════════════════════════════
    console.log("📢 Seeding announcements...");
    const announcements = [
        { title: "Campus Placement Drive - TCS", content: "TCS will be conducting a campus placement drive on March 20th. All eligible students should register by March 15th.", priority: "high", targetBatches: ["2024-A", "2024-B"], author: "Admin", createdAt: Timestamp.now() },
        { title: "Holiday Notice - Republic Day", content: "The institute will remain closed on January 26th for Republic Day celebrations.", priority: "medium", targetBatches: ["2024-A", "2024-B", "2025"], author: "Admin", createdAt: Timestamp.now() },
        { title: "New Course Launch - Cloud Computing", content: "We are launching a new Cloud Computing course starting February. Early bird registrations open now!", priority: "low", targetBatches: ["2025"], author: "Admin", createdAt: Timestamp.now() },
    ];

    for (const a of announcements) {
        await addDoc(collection(db, "announcements"), a);
    }
    console.log(`   ✅ ${announcements.length} announcements created\n`);

    // ═══════════════════════════════════════════
    // 7. SEED INTERVIEWS
    // ═══════════════════════════════════════════
    console.log("💼 Seeding interviews...");
    const interviews = [
        { companyName: "TCS", date: Timestamp.fromDate(new Date("2024-03-20")), location: "Campus", type: "on-campus", eligibleBatches: ["2024-A", "2024-B"], requirements: "BE/BTech with 60%+", salary: "3.5-6 LPA" },
        { companyName: "Infosys", date: Timestamp.fromDate(new Date("2024-04-05")), location: "Virtual", type: "virtual", eligibleBatches: ["2024-A", "2024-B", "2025"], requirements: "BE/BTech, good communication", salary: "4-7 LPA" },
        { companyName: "Wipro", date: Timestamp.fromDate(new Date("2024-04-15")), location: "Wipro Office, Pune", type: "off-campus", eligibleBatches: ["2024-A"], requirements: "BE/BTech CS/IT with 65%+", salary: "3.8-5.5 LPA" },
    ];

    for (const i of interviews) {
        await addDoc(collection(db, "interviews"), i);
    }
    console.log(`   ✅ ${interviews.length} interviews created\n`);

    // ═══════════════════════════════════════════
    // 8. SEED JOBS
    // ═══════════════════════════════════════════
    console.log("🏢 Seeding jobs...");
    const jobs = [
        { title: "Software Developer", company: "Google", location: "Bangalore", salary: "12-18 LPA", requirements: ["DSA", "System Design"], skills: ["Java", "Python"], deadline: Timestamp.fromDate(new Date("2024-05-01")), description: "Join Google's engineering team", type: "full-time", experienceLevel: "fresher" },
        { title: "Frontend Intern", company: "Flipkart", location: "Bangalore", salary: "40K/month", requirements: ["React", "JavaScript"], skills: ["React", "CSS"], deadline: Timestamp.fromDate(new Date("2024-04-15")), description: "6-month frontend internship", type: "internship", experienceLevel: "fresher" },
        { title: "Backend Developer", company: "Amazon", location: "Hyderabad", salary: "15-22 LPA", requirements: ["Node.js", "AWS"], skills: ["Node.js", "AWS", "MongoDB"], deadline: Timestamp.fromDate(new Date("2024-06-01")), description: "Build scalable backend services", type: "full-time", experienceLevel: "experienced" },
    ];

    for (const j of jobs) {
        await addDoc(collection(db, "jobs"), j);
    }
    console.log(`   ✅ ${jobs.length} jobs created\n`);

    // ═══════════════════════════════════════════
    // 9. SEED PLACEMENTS
    // ═══════════════════════════════════════════
    console.log("🎓 Seeding placements...");
    const placements = [
        {
            year: 2023,
            studentsPlaced: 120,
            totalStudents: 150,
            topCompanies: ["TCS", "Infosys", "Wipro", "Cognizant", "Accenture"],
            averagePackage: 5.2,
            highestPackage: 18,
            successStories: [
                { id: "ss1", studentName: "Rahul Mehta", company: "Google", package: 18, batch: "2023-A", testimonial: "Innova8's DSA program prepared me perfectly for Google's coding rounds." },
                { id: "ss2", studentName: "Sneha Patil", company: "Microsoft", package: 15, batch: "2023-A", testimonial: "The mock interviews at Innova8 were incredibly helpful." },
            ]
        },
        {
            year: 2024,
            studentsPlaced: 85,
            totalStudents: 180,
            topCompanies: ["TCS", "Infosys", "Amazon", "Flipkart"],
            averagePackage: 5.8,
            highestPackage: 22,
            successStories: [
                { id: "ss3", studentName: "Amit Kumar", company: "Amazon", package: 22, batch: "2024-A", testimonial: "The full stack course gave me the edge I needed." },
            ]
        }
    ];

    for (const p of placements) {
        await addDoc(collection(db, "placements"), p);
    }
    console.log(`   ✅ ${placements.length} placement records created\n`);

    // ═══════════════════════════════════════════
    // 10. SEED PROGRESS
    // ═══════════════════════════════════════════
    console.log("📊 Seeding student progress...");
    const progressData = [
        {
            userId: "student1",
            attendance: 87,
            completedModules: ["Arrays", "Linked Lists", "Stacks"],
            currentModule: "Queues",
            overallScore: 82,
            grades: [
                { subject: "Arrays", score: 85, total: 100, grade: "A" },
                { subject: "Linked Lists", score: 78, total: 100, grade: "B+" },
                { subject: "Stacks", score: 92, total: 100, grade: "A+" },
            ],
            milestones: [
                { id: "m1", title: "Complete 50 Problems", description: "Solve 50 DSA problems", completedAt: Timestamp.fromDate(new Date("2024-02-15")), isCompleted: true },
                { id: "m2", title: "Complete 100 Problems", description: "Solve 100 DSA problems", isCompleted: false },
            ]
        },
        {
            userId: "student2",
            attendance: 92,
            completedModules: ["HTML/CSS", "JavaScript", "React Basics"],
            currentModule: "Node.js",
            overallScore: 88,
            grades: [
                { subject: "HTML/CSS", score: 90, total: 100, grade: "A+" },
                { subject: "JavaScript", score: 85, total: 100, grade: "A" },
                { subject: "React", score: 88, total: 100, grade: "A" },
            ],
            milestones: [
                { id: "m1", title: "Build First Website", description: "Create a personal portfolio", completedAt: Timestamp.fromDate(new Date("2024-03-01")), isCompleted: true },
                { id: "m2", title: "Build Full Stack App", description: "Complete a MERN stack project", isCompleted: false },
            ]
        }
    ];

    for (const p of progressData) {
        await setDoc(doc(db, "progress", p.userId), p);
    }
    console.log(`   ✅ ${progressData.length} progress records created\n`);

    // ═══════════════════════════════════════════
    // 11. SEED STUDY MATERIALS
    // ═══════════════════════════════════════════
    console.log("📖 Seeding study materials...");
    const materials = [
        { title: "DSA Cheat Sheet", description: "Quick reference for common data structures and their operations", type: "pdf", url: "https://example.com/dsa-cheatsheet.pdf", category: "DSA", uploadedAt: Timestamp.now() },
        { title: "React Hooks Tutorial", description: "Complete video tutorial on React hooks", type: "video", url: "https://example.com/react-hooks", category: "Web Development", uploadedAt: Timestamp.now() },
        { title: "SQL Practice Problems", description: "50 SQL practice problems with solutions", type: "link", url: "https://example.com/sql-practice", category: "Database", uploadedAt: Timestamp.now() },
        { title: "System Design Primer", description: "Introduction to system design concepts", type: "pdf", url: "https://example.com/system-design.pdf", category: "System Design", uploadedAt: Timestamp.now() },
    ];

    for (const m of materials) {
        await addDoc(collection(db, "studyMaterials"), m);
    }
    console.log(`   ✅ ${materials.length} study materials created\n`);

    // ═══════════════════════════════════════════
    // 12. SEED EXAM RESULTS
    // ═══════════════════════════════════════════
    console.log("📋 Seeding exam results...");
    const results = [
        { userId: "student1", examId: "exam1", score: 85, totalMarks: 100, percentage: 85, submittedAt: Timestamp.fromDate(new Date("2024-03-15T11:30:00")), answers: [1, 1, 2], timeTaken: 2400 },
        { userId: "student2", examId: "exam1", score: 72, totalMarks: 100, percentage: 72, submittedAt: Timestamp.fromDate(new Date("2024-03-15T11:45:00")), answers: [1, 1, 0], timeTaken: 3000 },
        { userId: "student3", examId: "exam1", score: 90, totalMarks: 100, percentage: 90, submittedAt: Timestamp.fromDate(new Date("2024-03-15T11:15:00")), answers: [1, 1, 2], timeTaken: 1800 },
    ];

    for (const r of results) {
        await addDoc(collection(db, "examResults"), r);
    }
    console.log(`   ✅ ${results.length} exam results created\n`);

    console.log("═══════════════════════════════════════════");
    console.log("🎉 SEEDING COMPLETE!");
    console.log("═══════════════════════════════════════════");
    console.log("\n📌 Admin Login Credentials:");
    console.log("   Email:    admin@innova8.com");
    console.log("   Password: Admin@123");
    console.log("\n📊 Collections Created:");
    console.log("   • users (5 students + 1 admin)");
    console.log("   • fees (6 records)");
    console.log("   • exams (3 exams with questions)");
    console.log("   • courses (5 courses)");
    console.log("   • announcements (3 announcements)");
    console.log("   • interviews (3 opportunities)");
    console.log("   • jobs (3 listings)");
    console.log("   • placements (2 yearly records)");
    console.log("   • progress (2 student records)");
    console.log("   • studyMaterials (4 materials)");
    console.log("   • examResults (3 results)");

    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
