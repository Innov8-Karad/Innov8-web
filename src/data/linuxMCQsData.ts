export interface LinuxMCQ {
  id: string;
  questionNumber: number;
  subject?: string;
  chapter: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number; // 0=A, 1=B, 2=C, 3=D
  correctAnswerText: string;
  explanation: string;
}

export const LINUX_100_MCQS: LinuxMCQ[] = [
  // Chapter 1: File Management (1-15)
  {
    id: "pmq_1",
    questionNumber: 1,
    chapter: "File Management",
    questionText: "What is the primary purpose of the /boot directory?",
    options: ["Store user files", "Store boot-related files", "Store temporary files", "Store log files"],
    correctAnswerIndex: 1,
    correctAnswerText: "Store boot-related files",
    explanation: "The /boot directory contains the Linux kernel, initial RAM disk (initrd/initramfs), and bootloader configuration (such as GRUB)."
  },
  {
    id: "pmq_2",
    questionNumber: 2,
    chapter: "File Management",
    questionText: "What type of files are mainly stored in /etc?",
    options: ["User documents", "Device files", "Configuration files", "Temporary files"],
    correctAnswerIndex: 2,
    correctAnswerText: "Configuration files",
    explanation: "The /etc directory contains host-specific system-wide configuration files and startup scripts."
  },
  {
    id: "pmq_3",
    questionNumber: 3,
    chapter: "File Management",
    questionText: "Which directory is normally the home directory of the root user?",
    options: ["/home", "/root", "/admin", "/usr/root"],
    correctAnswerIndex: 1,
    correctAnswerText: "/root",
    explanation: "/root is the personal home directory of the root superuser, separate from regular users in /home."
  },
  {
    id: "pmq_4",
    questionNumber: 4,
    chapter: "File Management",
    questionText: "What is the purpose of /home?",
    options: ["Kernel files", "User home directories", "Boot files", "System logs"],
    correctAnswerIndex: 1,
    correctAnswerText: "User home directories",
    explanation: "/home contains individual home directories for regular user accounts where personal files and settings are saved."
  },
  {
    id: "pmq_5",
    questionNumber: 5,
    chapter: "File Management",
    questionText: "Which directories are commonly used for mounting filesystems or removable media?",
    options: ["/boot and /etc", "/mnt and /media", "/bin and /sbin", "/proc and /sys"],
    correctAnswerIndex: 1,
    correctAnswerText: "/mnt and /media",
    explanation: "/mnt is standard for temporarily mounted filesystems, while /media is commonly used for removable media like USB drives."
  },
  {
    id: "pmq_6",
    questionNumber: 6,
    chapter: "File Management",
    questionText: "What is the main difference between /bin and /sbin?",
    options: [
      "/bin contains logs, /sbin contains users",
      "/bin contains general commands, /sbin contains system administration commands",
      "Both contain only configuration files",
      "There is no difference"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "/bin contains general commands, /sbin contains system administration commands",
    explanation: "/bin contains essential user binaries accessible to all users, whereas /sbin contains binaries intended for root/system administration."
  },
  {
    id: "pmq_7",
    questionNumber: 7,
    chapter: "File Management",
    questionText: "Which command displays ACL information of a file?",
    options: ["setfacl", "getfacl", "aclshow", "lsacl"],
    correctAnswerIndex: 1,
    correctAnswerText: "getfacl",
    explanation: "getfacl (get file access control lists) displays file names, owner, group, and Access Control List permissions."
  },
  {
    id: "pmq_8",
    questionNumber: 8,
    chapter: "File Management",
    questionText: "Which command is used to modify ACLs?",
    options: ["getfacl", "chmodacl", "setfacl", "aclmod"],
    correctAnswerIndex: 2,
    correctAnswerText: "setfacl",
    explanation: "setfacl is used to set, modify, or remove Access Control Lists on files and directories."
  },
  {
    id: "pmq_9",
    questionNumber: 9,
    chapter: "File Management",
    questionText: "What is the purpose of the ACL mask?",
    options: [
      "Controls the maximum effective permissions",
      "Deletes ACL entries",
      "Changes file ownership",
      "Encrypts files"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "Controls the maximum effective permissions",
    explanation: "The ACL mask defines the maximum effective permissions allowed for named users, named groups, and the owning group."
  },
  {
    id: "pmq_10",
    questionNumber: 10,
    chapter: "File Management",
    questionText: "Which command copies files securely between systems?",
    options: ["cp", "scp", "mv", "ftp"],
    correctAnswerIndex: 1,
    correctAnswerText: "scp",
    explanation: "scp (secure copy) transfers files between hosts over an encrypted SSH connection."
  },
  {
    id: "pmq_11",
    questionNumber: 11,
    chapter: "File Management",
    questionText: "What does the -p option in scp preserve?",
    options: [
      "Password",
      "Process ID",
      "File attributes such as modification time and mode",
      "Network connection"
    ],
    correctAnswerIndex: 2,
    correctAnswerText: "File attributes such as modification time and mode",
    explanation: "The -p flag preserves modification times, access times, and permissions from the original file."
  },
  {
    id: "pmq_12",
    questionNumber: 12,
    chapter: "File Management",
    questionText: "Which command is generally more efficient for synchronizing large amounts of data?",
    options: ["scp", "rsync", "cat", "touch"],
    correctAnswerIndex: 1,
    correctAnswerText: "rsync",
    explanation: "rsync uses delta-transfer algorithms to synchronize only changed parts of files, making it much faster for large directories."
  },
  {
    id: "pmq_13",
    questionNumber: 13,
    chapter: "File Management",
    questionText: "Why can rsync be more efficient than scp?",
    options: [
      "It uses no network",
      "It transfers only changed data",
      "It deletes all files first",
      "It works only locally"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "It transfers only changed data",
    explanation: "rsync checks file timestamps and checksums to transfer only newly modified blocks or files."
  },
  {
    id: "pmq_14",
    questionNumber: 14,
    chapter: "File Management",
    questionText: "Which command would you use to view ACL permissions on file.txt?",
    options: ["getfacl file.txt", "setfacl file.txt", "chmod file.txt", "acl file.txt"],
    correctAnswerIndex: 0,
    correctAnswerText: "getfacl file.txt",
    explanation: "Running 'getfacl file.txt' prints the full ACL rules configured for file.txt."
  },
  {
    id: "pmq_15",
    questionNumber: 15,
    chapter: "File Management",
    questionText: "Which command would you use to grant ACL permissions to a user?",
    options: ["getfacl", "setfacl", "scp", "rsync"],
    correctAnswerIndex: 1,
    correctAnswerText: "setfacl",
    explanation: "'setfacl -m u:<username>:<perms> <file>' is used to grant specific ACL permissions to a user."
  },

  // Chapter 2: User Management (16-30)
  {
    id: "pmq_16",
    questionNumber: 16,
    chapter: "User Management",
    questionText: "What UID is assigned to the root user?",
    options: ["1", "100", "500", "0"],
    correctAnswerIndex: 3,
    correctAnswerText: "0",
    explanation: "In Linux systems, the root superuser account is always assigned User Identifier (UID) 0."
  },
  {
    id: "pmq_17",
    questionNumber: 17,
    chapter: "User Management",
    questionText: "Which file stores basic user account information?",
    options: ["/etc/shadow", "/etc/passwd", "/etc/group", "/etc/users"],
    correctAnswerIndex: 1,
    correctAnswerText: "/etc/passwd",
    explanation: "/etc/passwd stores general user attributes including username, UID, GID, home directory, and default shell."
  },
  {
    id: "pmq_18",
    questionNumber: 18,
    chapter: "User Management",
    questionText: "Which file stores password-related information?",
    options: ["/etc/passwd", "/etc/group", "/etc/shadow", "/etc/security"],
    correctAnswerIndex: 2,
    correctAnswerText: "/etc/shadow",
    explanation: "/etc/shadow stores hashed user passwords and password expiration policies, readable only by root."
  },
  {
    id: "pmq_19",
    questionNumber: 19,
    chapter: "User Management",
    questionText: "Which command is commonly used to create a user?",
    options: ["useradd", "userdel", "usermod", "passwd"],
    correctAnswerIndex: 0,
    correctAnswerText: "useradd",
    explanation: "useradd (or adduser) creates new user accounts with specified shell and home directory defaults."
  },
  {
    id: "pmq_20",
    questionNumber: 20,
    chapter: "User Management",
    questionText: "Which command deletes a user?",
    options: ["userremove", "deluser only", "userdel", "removeuser"],
    correctAnswerIndex: 2,
    correctAnswerText: "userdel",
    explanation: "userdel deletes user accounts from the system."
  },
  {
    id: "pmq_21",
    questionNumber: 21,
    chapter: "User Management",
    questionText: "Which command changes a user's login shell?",
    options: ["chsh", "shellmod", "usermod -u", "passwd"],
    correctAnswerIndex: 0,
    correctAnswerText: "chsh",
    explanation: "chsh (change shell) alters the user's default login shell listed in /etc/passwd."
  },
  {
    id: "pmq_22",
    questionNumber: 22,
    chapter: "User Management",
    questionText: "Which command can be used to change a user's UID?",
    options: ["useradd", "usermod", "passwd", "groupmod"],
    correctAnswerIndex: 1,
    correctAnswerText: "usermod",
    explanation: "'usermod -u <new_UID> <username>' changes the user's numeric UID."
  },
  {
    id: "pmq_23",
    questionNumber: 23,
    chapter: "User Management",
    questionText: "What does the passwd command primarily do?",
    options: ["Creates a group", "Changes a user's password", "Changes UID", "Displays processes"],
    correctAnswerIndex: 1,
    correctAnswerText: "Changes a user's password",
    explanation: "passwd updates user authentication tokens (passwords)."
  },
  {
    id: "pmq_24",
    questionNumber: 24,
    chapter: "User Management",
    questionText: "Which command creates a group named developers?",
    options: ["groupadd developers", "group create developers", "mkgroup developers", "addgroupuser developers"],
    correctAnswerIndex: 0,
    correctAnswerText: "groupadd developers",
    explanation: "groupadd is the standard system utility used to create a new group."
  },
  {
    id: "pmq_25",
    questionNumber: 25,
    chapter: "User Management",
    questionText: "Which file contains group information?",
    options: ["/etc/groups", "/etc/group", "/etc/grouplist", "/etc/shadow"],
    correctAnswerIndex: 1,
    correctAnswerText: "/etc/group",
    explanation: "/etc/group lists group names, group passwords (x), GIDs, and member user lists."
  },
  {
    id: "pmq_26",
    questionNumber: 26,
    chapter: "User Management",
    questionText: "If a group is deleted while users still have that group as a supplementary group, what happens?",
    options: [
      "Users are automatically deleted",
      "Their passwords are deleted",
      "The group entry is removed, but user accounts remain",
      "The system shuts down"
    ],
    correctAnswerIndex: 2,
    correctAnswerText: "The group entry is removed, but user accounts remain",
    explanation: "Deleting a group removes its entry from /etc/group without deleting member user accounts."
  },
  {
    id: "pmq_27",
    questionNumber: 27,
    chapter: "User Management",
    questionText: "Which command modifies an existing user account?",
    options: ["usermod", "userchange", "modifyuser", "passwdmod"],
    correctAnswerIndex: 0,
    correctAnswerText: "usermod",
    explanation: "usermod modifies system account attributes such as supplementary groups, shell, comments, or UID."
  },
  {
    id: "pmq_28",
    questionNumber: 28,
    chapter: "User Management",
    questionText: "Which option of userdel is commonly used to remove a user's home directory?",
    options: ["-r", "-h", "-d", "-x"],
    correctAnswerIndex: 0,
    correctAnswerText: "-r",
    explanation: "'userdel -r <user>' removes the user account along with their home directory and mail spool."
  },
  {
    id: "pmq_29",
    questionNumber: 29,
    chapter: "User Management",
    questionText: "Which command displays the current user's UID and GID?",
    options: ["who", "id", "users", "groupshow"],
    correctAnswerIndex: 1,
    correctAnswerText: "id",
    explanation: "id prints real and effective user (UID) and group (GID) identifiers."
  },
  {
    id: "pmq_30",
    questionNumber: 30,
    chapter: "User Management",
    questionText: "Which command displays the groups a user belongs to?",
    options: ["groups", "groupid", "idgroup", "showgroup"],
    correctAnswerIndex: 0,
    correctAnswerText: "groups",
    explanation: "groups prints all primary and supplementary groups of the current or specified user."
  },

  // Chapter 3: Network Management (31-45)
  {
    id: "pmq_31",
    questionNumber: 31,
    chapter: "Network Management",
    questionText: "What does the ping command primarily check?",
    options: ["Disk usage", "Network connectivity", "CPU usage", "User permissions"],
    correctAnswerIndex: 1,
    correctAnswerText: "Network connectivity",
    explanation: "ping verifies reachability and round-trip time to a remote host across an IP network."
  },
  {
    id: "pmq_32",
    questionNumber: 32,
    chapter: "Network Management",
    questionText: "Which protocol does ping normally use?",
    options: ["TCP", "FTP", "ICMP", "SSH"],
    correctAnswerIndex: 2,
    correctAnswerText: "ICMP",
    explanation: "ping sends ICMP ECHO_REQUEST datagrams and listens for ECHO_REPLY packets."
  },
  {
    id: "pmq_33",
    questionNumber: 33,
    chapter: "Network Management",
    questionText: "What is nslookup primarily used for?",
    options: ["Process management", "DNS lookup", "Disk partitioning", "User management"],
    correctAnswerIndex: 1,
    correctAnswerText: "DNS lookup",
    explanation: "nslookup queries Internet name servers interactively for DNS host and record mappings."
  },
  {
    id: "pmq_34",
    questionNumber: 34,
    chapter: "Network Management",
    questionText: "Which command is commonly used for detailed DNS queries?",
    options: ["dig", "route", "top", "free"],
    correctAnswerIndex: 0,
    correctAnswerText: "dig",
    explanation: "dig (domain information groper) is a flexible tool for interrogating DNS name servers."
  },
  {
    id: "pmq_35",
    questionNumber: 35,
    chapter: "Network Management",
    questionText: "Which tool can analyze network packets in real time from the command line?",
    options: ["tcpdump", "passwd", "vmstat", "df"],
    correctAnswerIndex: 0,
    correctAnswerText: "tcpdump",
    explanation: "tcpdump is a command-line packet analyzer that captures and logs TCP/IP traffic on an interface."
  },
  {
    id: "pmq_36",
    questionNumber: 36,
    chapter: "Network Management",
    questionText: "What does ifconfig traditionally display?",
    options: ["User accounts", "Network interface information", "Running services", "Installed packages"],
    correctAnswerIndex: 1,
    correctAnswerText: "Network interface information",
    explanation: "ifconfig displays network interface parameters, IP addresses, MAC addresses, and packet counters."
  },
  {
    id: "pmq_37",
    questionNumber: 37,
    chapter: "Network Management",
    questionText: "What is the purpose of wget?",
    options: ["Download files from network locations", "Create users", "Monitor CPU", "Start services"],
    correctAnswerIndex: 0,
    correctAnswerText: "Download files from network locations",
    explanation: "wget is a non-interactive network downloader supporting HTTP, HTTPS, and FTP protocols."
  },
  {
    id: "pmq_38",
    questionNumber: 38,
    chapter: "Network Management",
    questionText: "Which command can transfer data using various protocols and can also make HTTP API requests?",
    options: ["curl", "free", "ps", "lsblk"],
    correctAnswerIndex: 0,
    correctAnswerText: "curl",
    explanation: "curl transfers data using HTTP, HTTPS, FTP, and other protocols with header and payload customization."
  },
  {
    id: "pmq_39",
    questionNumber: 39,
    chapter: "Network Management",
    questionText: "Which command displays the system hostname?",
    options: ["hostshow", "hostname", "systemname", "unamehost"],
    correctAnswerIndex: 1,
    correctAnswerText: "hostname",
    explanation: "hostname displays or sets the system's DNS network name."
  },
  {
    id: "pmq_40",
    questionNumber: 40,
    chapter: "Network Management",
    questionText: "What is UFW primarily used for?",
    options: ["User management", "Firewall management", "File compression", "Process scheduling"],
    correctAnswerIndex: 1,
    correctAnswerText: "Firewall management",
    explanation: "UFW (Uncomplicated Firewall) provides a simplified frontend for managing iptables/nftables firewall rules."
  },
  {
    id: "pmq_41",
    questionNumber: 41,
    chapter: "Network Management",
    questionText: "What does firewalld use to organize firewall rules?",
    options: ["Tables", "Trusted zones", "Users", "Partitions"],
    correctAnswerIndex: 1,
    correctAnswerText: "Trusted zones",
    explanation: "firewalld organizes network traffic filtering through configurable security zones (e.g. public, trusted, drop)."
  },
  {
    id: "pmq_42",
    questionNumber: 42,
    chapter: "Network Management",
    questionText: "Which command tests whether a host is reachable?",
    options: ["ping", "ls", "free", "who"],
    correctAnswerIndex: 0,
    correctAnswerText: "ping",
    explanation: "ping tests whether a target host is online and reachable over the network."
  },
  {
    id: "pmq_43",
    questionNumber: 43,
    chapter: "Network Management",
    questionText: "A DNS name is not resolving to an IP address. Which command is useful for troubleshooting?",
    options: ["nslookup", "kill", "chmod", "free"],
    correctAnswerIndex: 0,
    correctAnswerText: "nslookup",
    explanation: "nslookup helps troubleshoot DNS resolution problems by directly querying specified nameservers."
  },
  {
    id: "pmq_44",
    questionNumber: 44,
    chapter: "Network Management",
    questionText: "Which command is particularly useful for examining DNS records such as A, MX and NS records?",
    options: ["dig", "ps", "scp", "systemctl"],
    correctAnswerIndex: 0,
    correctAnswerText: "dig",
    explanation: "dig allows specific DNS query types (e.g., 'dig MX domain.com') with verbose resolution diagnostics."
  },
  {
    id: "pmq_45",
    questionNumber: 45,
    chapter: "Network Management",
    questionText: "Which command is commonly used to capture network packets for troubleshooting?",
    options: ["tcpdump", "passwd", "rsync", "lscpu"],
    correctAnswerIndex: 0,
    correctAnswerText: "tcpdump",
    explanation: "tcpdump captures raw packet headers and payloads matching specific filters on network adapters."
  },

  // Chapter 4: System Management (46-60)
  {
    id: "pmq_46",
    questionNumber: 46,
    chapter: "System Management",
    questionText: "What does the free command display?",
    options: ["Network connections", "Memory usage", "User accounts", "Running services"],
    correctAnswerIndex: 1,
    correctAnswerText: "Memory usage",
    explanation: "free displays total, used, free, shared, buffer/cache, and available physical RAM and swap space."
  },
  {
    id: "pmq_47",
    questionNumber: 47,
    chapter: "System Management",
    questionText: "Which command displays how long the system has been running?",
    options: ["runtime", "uptime", "systemtime", "bootinfo"],
    correctAnswerIndex: 1,
    correctAnswerText: "uptime",
    explanation: "uptime displays the current time, elapsed time since last boot, logged-in users, and system load averages."
  },
  {
    id: "pmq_48",
    questionNumber: 48,
    chapter: "System Management",
    questionText: "What information does lscpu provide?",
    options: [
      "CPU architecture and processor information",
      "Disk partitions only",
      "User information",
      "Network packet information"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "CPU architecture and processor information",
    explanation: "lscpu gathers CPU architecture information such as cores, sockets, threads, cache sizes, and CPU model."
  },
  {
    id: "pmq_49",
    questionNumber: 49,
    chapter: "System Management",
    questionText: "What does lsblk display?",
    options: ["CPU details", "Block devices and storage layout", "Network packets", "Users"],
    correctAnswerIndex: 1,
    correctAnswerText: "Block devices and storage layout",
    explanation: "lsblk lists block storage devices (hard drives, SSDs, partitions, mount points) in a tree-like hierarchy."
  },
  {
    id: "pmq_50",
    questionNumber: 50,
    chapter: "System Management",
    questionText: "What does vmstat monitor?",
    options: [
      "Virtual memory, processes, CPU and I/O statistics",
      "Only network traffic",
      "Only disk partitions",
      "Only users"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "Virtual memory, processes, CPU and I/O statistics",
    explanation: "vmstat reports information about processes, memory, paging, block I/O, traps, and CPU activity."
  },
  {
    id: "pmq_51",
    questionNumber: 51,
    chapter: "System Management",
    questionText: "Which vmstat column represents CPU idle time?",
    options: ["us", "sy", "id", "wa"],
    correctAnswerIndex: 2,
    correctAnswerText: "id",
    explanation: "In vmstat CPU output, 'us' is user time, 'sy' is system time, 'id' is idle time, and 'wa' is I/O wait time."
  },
  {
    id: "pmq_52",
    questionNumber: 52,
    chapter: "System Management",
    questionText: "Which command displays memory information in human-readable format?",
    options: ["free -h", "free -x", "mem -h", "memory -human"],
    correctAnswerIndex: 0,
    correctAnswerText: "free -h",
    explanation: "'free -h' outputs memory in megabytes/gigabytes (e.g. 8G, 512M) for easy human reading."
  },
  {
    id: "pmq_53",
    questionNumber: 53,
    chapter: "System Management",
    questionText: "What does NUMA stand for?",
    options: [
      "Network User Memory Access",
      "Non-Uniform Memory Access",
      "New Unified Memory Architecture",
      "Network Unified Memory Allocation"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "Non-Uniform Memory Access",
    explanation: "NUMA is a computer memory design used in multiprocessing where memory access time depends on the memory location relative to a processor."
  },
  {
    id: "pmq_54",
    questionNumber: 54,
    chapter: "System Management",
    questionText: "In vmstat, which field indicates the number of processes waiting for runtime?",
    options: ["r", "b", "si", "so"],
    correctAnswerIndex: 0,
    correctAnswerText: "r",
    explanation: "The 'r' column in vmstat indicates the number of runnable processes waiting in the CPU run queue."
  },
  {
    id: "pmq_55",
    questionNumber: 55,
    chapter: "System Management",
    questionText: "In vmstat, what does bo represent?",
    options: ["Blocks received", "Blocks sent out", "Boot time", "CPU busy time"],
    correctAnswerIndex: 1,
    correctAnswerText: "Blocks sent out",
    explanation: "Under the IO section of vmstat, 'bi' is blocks received in from a device and 'bo' is blocks sent out to a block device."
  },
  {
    id: "pmq_56",
    questionNumber: 56,
    chapter: "System Management",
    questionText: "If free -h shows very little available memory, what should an administrator investigate?",
    options: ["Memory-consuming processes", "Hostname only", "User shell only", "DNS records only"],
    correctAnswerIndex: 0,
    correctAnswerText: "Memory-consuming processes",
    explanation: "Administrators should use tools like 'top', 'htop', or 'ps aux --sort=-%mem' to find processes consuming RAM."
  },
  {
    id: "pmq_57",
    questionNumber: 57,
    chapter: "System Management",
    questionText: "Which command can help determine CPU architecture?",
    options: ["lscpu", "lsmemonly", "cpuinfo", "cpushow"],
    correctAnswerIndex: 0,
    correctAnswerText: "lscpu",
    explanation: "lscpu details system architecture (e.g. x86_64, aarch64, 32-bit/64-bit operation modes)."
  },
  {
    id: "pmq_58",
    questionNumber: 58,
    chapter: "System Management",
    questionText: "Which command is useful for identifying disks and partitions?",
    options: ["lsblk", "lscpu", "free", "ping"],
    correctAnswerIndex: 0,
    correctAnswerText: "lsblk",
    explanation: "lsblk lists disks, RAID arrays, LVM volumes, and partition layouts."
  },
  {
    id: "pmq_59",
    questionNumber: 59,
    chapter: "System Management",
    questionText: "A system administrator wants to check system load and CPU statistics periodically. Which command is appropriate?",
    options: ["vmstat", "passwd", "scp", "wget"],
    correctAnswerIndex: 0,
    correctAnswerText: "vmstat",
    explanation: "'vmstat 2 5' prints system load and resource consumption every 2 seconds for 5 intervals."
  },
  {
    id: "pmq_60",
    questionNumber: 60,
    chapter: "System Management",
    questionText: "In vmstat, a high wa value generally indicates the CPU is spending significant time waiting for:",
    options: ["User login", "I/O operations", "DNS", "Password authentication"],
    correctAnswerIndex: 1,
    correctAnswerText: "I/O operations",
    explanation: "'wa' (wait I/O) measures the percentage of CPU time spent waiting for disk or network I/O to complete."
  },

  // Chapter 5: Service Management (61-70)
  {
    id: "pmq_61",
    questionNumber: 61,
    chapter: "Service Management",
    questionText: "Which command starts a service using systemd?",
    options: [
      "systemctl start service",
      "service start systemctl",
      "startservice systemd",
      "system-start service"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "systemctl start service",
    explanation: "'systemctl start <service_name>' is the systemd command to immediately activate a service."
  },
  {
    id: "pmq_62",
    questionNumber: 62,
    chapter: "Service Management",
    questionText: "Which command stops a running service?",
    options: [
      "systemctl kill-service",
      "systemctl stop service",
      "service off service",
      "stopctl service"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "systemctl stop service",
    explanation: "'systemctl stop <service_name>' shuts down a running service."
  },
  {
    id: "pmq_63",
    questionNumber: 63,
    chapter: "Service Management",
    questionText: "What does enabling a service do?",
    options: [
      "Starts it immediately only",
      "Configures it to start automatically at boot",
      "Deletes the service",
      "Stops the service"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "Configures it to start automatically at boot",
    explanation: "Enabling a service creates symbolic links in systemd target directories to ensure automatic startup during boot."
  },
  {
    id: "pmq_64",
    questionNumber: 64,
    chapter: "Service Management",
    questionText: "How do you check the status of a service?",
    options: [
      "systemctl status service",
      "servicecheck service",
      "systemctl showstatus service",
      "statusctl service"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "systemctl status service",
    explanation: "'systemctl status <service>' outputs runtime status, process PID, active state, and recent logs."
  },
  {
    id: "pmq_65",
    questionNumber: 65,
    chapter: "Service Management",
    questionText: "What does disabling a service prevent?",
    options: ["Manual execution", "Automatic startup at boot", "Configuration changes", "Logging"],
    correctAnswerIndex: 1,
    correctAnswerText: "Automatic startup at boot",
    explanation: "Disabling a service removes boot target symlinks, preventing it from auto-starting on next system boot."
  },
  {
    id: "pmq_66",
    questionNumber: 66,
    chapter: "Service Management",
    questionText: "Which command enables Apache to start automatically at boot?",
    options: [
      "systemctl enable apache2",
      "systemctl boot apache2",
      "enable apache2 now",
      "apache2 enable boot"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "systemctl enable apache2",
    explanation: "'systemctl enable apache2' registers Apache for automatic boot activation on Debian/Ubuntu systems."
  },
  {
    id: "pmq_67",
    questionNumber: 67,
    chapter: "Service Management",
    questionText: "What is the default service manager on most modern Linux distributions?",
    options: ["SysV only", "systemd", "initctl", "xinetd"],
    correctAnswerIndex: 1,
    correctAnswerText: "systemd",
    explanation: "systemd is the standard init system and service manager adopted across modern Linux distributions."
  },
  {
    id: "pmq_68",
    questionNumber: 68,
    chapter: "Service Management",
    questionText: "Which command lists failed systemd units?",
    options: ["systemctl failed", "systemctl --failed", "systemd failed-services", "service --failed"],
    correctAnswerIndex: 1,
    correctAnswerText: "systemctl --failed",
    explanation: "'systemctl --failed' filters and displays all services and units currently in an error/failed state."
  },
  {
    id: "pmq_69",
    questionNumber: 69,
    chapter: "Service Management",
    questionText: "Which command restarts a service?",
    options: [
      "systemctl restart service",
      "systemctl reload-service service",
      "service reboot service",
      "restartctl service"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "systemctl restart service",
    explanation: "'systemctl restart <service>' terminates the running instance and launches a new one."
  },
  {
    id: "pmq_70",
    questionNumber: 70,
    chapter: "Service Management",
    questionText: "Where are systemd service unit files commonly located?",
    options: [
      "/etc/systemd/system/",
      "/etc/users/",
      "/var/service/only/",
      "/home/systemd/"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "/etc/systemd/system/",
    explanation: "System administrators place custom or override unit files in /etc/systemd/system/ (preceding /lib/systemd/system/)."
  },

  // Chapter 6: Process Management (71-80)
  {
    id: "pmq_71",
    questionNumber: 71,
    chapter: "Process Management",
    questionText: "What does the ps command display?",
    options: ["Running processes", "Disk partitions", "Network interfaces", "User passwords"],
    correctAnswerIndex: 0,
    correctAnswerText: "Running processes",
    explanation: "ps (process status) provides a snapshot of currently running processes."
  },
  {
    id: "pmq_72",
    questionNumber: 72,
    chapter: "Process Management",
    questionText: "What is the purpose of the kill command?",
    options: ["Delete a file", "Send a signal to a process", "Shut down the server only", "Kill a user account"],
    correctAnswerIndex: 1,
    correctAnswerText: "Send a signal to a process",
    explanation: "kill transmits specified signals (SIGTERM, SIGKILL, SIGHUP, etc.) to target process IDs."
  },
  {
    id: "pmq_73",
    questionNumber: 73,
    chapter: "Process Management",
    questionText: "Which signal is sent by kill -9?",
    options: ["SIGTERM", "SIGSTOP", "SIGKILL", "SIGHUP"],
    correctAnswerIndex: 2,
    correctAnswerText: "SIGKILL",
    explanation: "Signal number 9 is SIGKILL, which forces immediate termination and cannot be caught or ignored."
  },
  {
    id: "pmq_74",
    questionNumber: 74,
    chapter: "Process Management",
    questionText: "Which command brings a background job to the foreground?",
    options: ["fg", "bg", "front", "jobfg"],
    correctAnswerIndex: 0,
    correctAnswerText: "fg",
    explanation: "'fg' (foreground) switches suspended or background jobs into the interactive terminal foreground."
  },
  {
    id: "pmq_75",
    questionNumber: 75,
    chapter: "Process Management",
    questionText: "What is the purpose of the bg command?",
    options: [
      "Move a stopped job to the background",
      "Delete background jobs",
      "Display background processes",
      "Stop all background jobs"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "Move a stopped job to the background",
    explanation: "'bg' resumes stopped or paused jobs, running them in the background."
  },
  {
    id: "pmq_76",
    questionNumber: 76,
    chapter: "Process Management",
    questionText: "What is a zombie process?",
    options: [
      "A process consuming 100% CPU",
      "A terminated process whose parent has not yet collected its exit status",
      "A process running as root",
      "A kernel process"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "A terminated process whose parent has not yet collected its exit status",
    explanation: "A zombie (defunct) process has finished execution but remains in the process table until its parent calls wait()."
  },
  {
    id: "pmq_77",
    questionNumber: 77,
    chapter: "Process Management",
    questionText: "What is the major difference between SIGTERM and SIGKILL?",
    options: [
      "Both are identical",
      "SIGTERM allows graceful termination; SIGKILL forces termination",
      "SIGKILL is graceful",
      "SIGTERM cannot terminate processes"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "SIGTERM allows graceful termination; SIGKILL forces termination",
    explanation: "SIGTERM (15) asks a process to clean up resources and exit gracefully; SIGKILL (9) is handled by the kernel and kills it immediately."
  },
  {
    id: "pmq_78",
    questionNumber: 78,
    chapter: "Process Management",
    questionText: "What does renice do?",
    options: [
      "Changes a process's scheduling priority",
      "Renames a process",
      "Restarts a process",
      "Deletes a process"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "Changes a process's scheduling priority",
    explanation: "renice alters the scheduling priority (nice value from -20 to 19) of running processes."
  },
  {
    id: "pmq_79",
    questionNumber: 79,
    chapter: "Process Management",
    questionText: "Which command can display all processes with full command information?",
    options: ["ps aux", "ps only", "process -all", "showproc -f"],
    correctAnswerIndex: 0,
    correctAnswerText: "ps aux",
    explanation: "'ps aux' displays all processes across all users with user, CPU, memory, start time, and full command arguments."
  },
  {
    id: "pmq_80",
    questionNumber: 80,
    chapter: "Process Management",
    questionText: "What is the main difference between a foreground and background process?",
    options: [
      "Background processes cannot run",
      "Foreground processes interact directly with the terminal; background processes do not block it",
      "Foreground processes always run as root",
      "Background processes always have higher priority"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "Foreground processes interact directly with the terminal; background processes do not block it",
    explanation: "Foreground processes occupy the terminal standard input/output, whereas background processes run without blocking shell prompts."
  },

  // Chapter 7: Software Management (81-90)
  {
    id: "pmq_81",
    questionNumber: 81,
    chapter: "Software Management",
    questionText: "What does apt update do?",
    options: [
      "Updates the Linux kernel",
      "Refreshes package repository information",
      "Installs all packages",
      "Removes old packages"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "Refreshes package repository information",
    explanation: "'apt update' fetches the latest package lists and metadata from configured package repositories."
  },
  {
    id: "pmq_82",
    questionNumber: 82,
    chapter: "Software Management",
    questionText: "Which command installs a package using APT?",
    options: ["apt install package", "apt add package", "apt get package", "apt create package"],
    correctAnswerIndex: 0,
    correctAnswerText: "apt install package",
    explanation: "'apt install <package_name>' downloads and installs the package and its dependencies."
  },
  {
    id: "pmq_83",
    questionNumber: 83,
    chapter: "Software Management",
    questionText: "Which command removes a package?",
    options: ["apt delete package", "apt remove package", "apt eraseall package", "apt uninstall package"],
    correctAnswerIndex: 1,
    correctAnswerText: "apt remove package",
    explanation: "'apt remove <package>' uninstalls package binaries while preserving configuration files."
  },
  {
    id: "pmq_84",
    questionNumber: 84,
    chapter: "Software Management",
    questionText: "What does apt upgrade generally do?",
    options: [
      "Upgrades installed packages",
      "Removes all packages",
      "Changes the Linux distribution",
      "Creates a repository"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "Upgrades installed packages",
    explanation: "'apt upgrade' upgrades all currently installed packages to their newest available versions without removing dependencies."
  },
  {
    id: "pmq_85",
    questionNumber: 85,
    chapter: "Software Management",
    questionText: "Which command removes a package along with its configuration files?",
    options: ["apt remove", "apt purge", "apt clean", "apt delete-config"],
    correctAnswerIndex: 1,
    correctAnswerText: "apt purge",
    explanation: "'apt purge <package>' removes both the package binaries and its system configuration files."
  },
  {
    id: "pmq_86",
    questionNumber: 86,
    chapter: "Software Management",
    questionText: "Which command can list installed packages on a Debian-based system?",
    options: ["apt list --installed", "apt packages", "show installed", "apt installed-only"],
    correctAnswerIndex: 0,
    correctAnswerText: "apt list --installed",
    explanation: "'apt list --installed' lists all packages currently installed via APT and dpkg."
  },
  {
    id: "pmq_87",
    questionNumber: 87,
    chapter: "Software Management",
    questionText: "What is the purpose of apt autoremove?",
    options: [
      "Removes packages that are no longer required as dependencies",
      "Removes every installed package",
      "Removes configuration files only",
      "Removes the APT program"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "Removes packages that are no longer required as dependencies",
    explanation: "'apt autoremove' uninstalls packages that were automatically installed to satisfy dependencies for other packages and are no longer needed."
  },
  {
    id: "pmq_88",
    questionNumber: 88,
    chapter: "Software Management",
    questionText: "What does --only-upgrade generally do?",
    options: [
      "Installs packages that do not exist",
      "Upgrades a package only if it is already installed",
      "Removes old packages",
      "Updates repositories"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "Upgrades a package only if it is already installed",
    explanation: "Running 'apt install --only-upgrade <pkg>' ensures the package is only updated if it is already present, avoiding new installations."
  },
  {
    id: "pmq_89",
    questionNumber: 89,
    chapter: "Software Management",
    questionText: "How does apt full-upgrade differ from apt upgrade?",
    options: [
      "It cannot upgrade packages",
      "It may handle dependency changes by installing/removing packages when necessary",
      "It only updates repository information",
      "It only removes packages"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "It may handle dependency changes by installing/removing packages when necessary",
    explanation: "full-upgrade (or dist-upgrade) will proactively install new dependencies or remove obsolete conflicting packages to complete system upgrades."
  },
  {
    id: "pmq_90",
    questionNumber: 90,
    chapter: "Software Management",
    questionText: "What does apt clean remove?",
    options: [
      "User accounts",
      "Downloaded package files from the local package cache",
      "Configuration files",
      "Running processes"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "Downloaded package files from the local package cache",
    explanation: "'apt clean' clears the local repository cache (/var/cache/apt/archives/) of downloaded .deb package files to reclaim disk space."
  },

  // Chapter 8: Servers (91-100)
  {
    id: "pmq_91",
    questionNumber: 91,
    chapter: "Servers",
    questionText: "Which command installs Apache on Ubuntu?",
    options: ["apt install apache2", "yum install apache", "install apache-server", "apache install"],
    correctAnswerIndex: 0,
    correctAnswerText: "apt install apache2",
    explanation: "In Debian/Ubuntu package archives, the Apache HTTP web server is packaged under 'apache2'."
  },
  {
    id: "pmq_92",
    questionNumber: 92,
    chapter: "Servers",
    questionText: "Which command checks whether Apache is running on a systemd-based Ubuntu system?",
    options: [
      "systemctl status apache2",
      "apache status",
      "service apache checkonly",
      "apache2 running"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "systemctl status apache2",
    explanation: "'systemctl status apache2' displays the active status, PID, and recent log entries for Apache."
  },
  {
    id: "pmq_93",
    questionNumber: 93,
    chapter: "Servers",
    questionText: "What is the default port for SSH?",
    options: ["21", "22", "23", "80"],
    correctAnswerIndex: 1,
    correctAnswerText: "22",
    explanation: "SSH (Secure Shell) standard TCP listening port is port 22."
  },
  {
    id: "pmq_94",
    questionNumber: 94,
    chapter: "Servers",
    questionText: "Which command starts an SFTP session?",
    options: ["sftp username@server", "ftp-secure username", "sshftp server", "sftp-start server"],
    correctAnswerIndex: 0,
    correctAnswerText: "sftp username@server",
    explanation: "Running 'sftp username@server' starts an encrypted file transfer shell session over SSH."
  },
  {
    id: "pmq_95",
    questionNumber: 95,
    chapter: "Servers",
    questionText: "What is the primary difference between FTP and SFTP?",
    options: [
      "FTP is encrypted, SFTP is not",
      "SFTP operates over SSH and provides encrypted transfer",
      "Both are exactly the same",
      "FTP works only locally"
    ],
    correctAnswerIndex: 1,
    correctAnswerText: "SFTP operates over SSH and provides encrypted transfer",
    explanation: "FTP sends credentials and data in plain text, whereas SFTP runs on top of the SSH protocol and encrypts all communications."
  },
  {
    id: "pmq_96",
    questionNumber: 96,
    chapter: "Servers",
    questionText: "Which SFTP command uploads a local file to the remote server?",
    options: ["download", "put", "sendfile", "uploadfile"],
    correctAnswerIndex: 1,
    correctAnswerText: "put",
    explanation: "In an interactive sftp/ftp prompt, 'put <filename>' uploads a local file to the remote directory."
  },
  {
    id: "pmq_97",
    questionNumber: 97,
    chapter: "Servers",
    questionText: "Which command can download a file from a remote server using SCP?",
    options: [
      "scp user@server:/path/file /local/path/",
      "scp /local/path/file user@server:/path/",
      "scp download user@server",
      "scp get server"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "scp user@server:/path/file /local/path/",
    explanation: "SCP syntax follows 'scp [source] [destination]'. Specifying remote server first downloads to local path."
  },
  {
    id: "pmq_98",
    questionNumber: 98,
    chapter: "Servers",
    questionText: "Which command is used to log into a remote Linux server?",
    options: ["ssh user@server", "remote user@server", "login-server user", "connect user"],
    correctAnswerIndex: 0,
    correctAnswerText: "ssh user@server",
    explanation: "'ssh user@server' establishes an authenticated, encrypted interactive shell session with the remote machine."
  },
  {
    id: "pmq_99",
    questionNumber: 99,
    chapter: "Servers",
    questionText: "Which command ensures Apache starts automatically after boot?",
    options: [
      "systemctl enable apache2",
      "systemctl boot apache2",
      "apache2 autostart",
      "enable-service apache2-now"
    ],
    correctAnswerIndex: 0,
    correctAnswerText: "systemctl enable apache2",
    explanation: "'systemctl enable apache2' configures Apache to start up automatically on system boot."
  },
  {
    id: "pmq_100",
    questionNumber: 100,
    chapter: "Servers",
    questionText: "What does mget do in an SFTP/FTP-style client?",
    options: ["Uploads multiple files", "Downloads multiple files", "Deletes multiple files", "Renames multiple files"],
    correctAnswerIndex: 1,
    correctAnswerText: "Downloads multiple files",
    explanation: "'mget' (multiple get) downloads multiple remote files matching a wildcard or pattern to the local machine."
  }
];
