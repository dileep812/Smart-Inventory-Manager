# 📦 Smart Inventory Manager (AI-Powered)

> A next-generation SaaS Inventory Management & POS system enhanced with Artificial Intelligence for effortless product management.

**[Live Demo](https://smart-inventory-manager-gmoj.vercel.app/)** | **[GitHub Repo](https://github.com/dileep812/smart-inventory)**

---

## 📖 Overview

**Smart Inventory Manager** is a full-stack web application that streamlines business operations by combining a powerful Point of Sale (POS) system with intelligent automation. 

Unlike traditional inventory apps where manual entry is slow, this project uses **Generative AI** to instantly create product metadata—generating unique SKUs, writing detailed descriptions, and suggesting prices automatically.

## ✨ Key Features

### 🤖 AI-Powered Automation
* **⚡ Smart SKU Generation:** Automatically creates unique, logical Stock Keeping Units (SKUs) for every new product, eliminating manual tracking errors.
* **📝 AI Product Descriptions:** Generates professional, detailed product descriptions instantly based on just the product name and category using **Gemini AI**.
* **💰 Intelligent Auto-Pricing:** Analyzes product details to suggest optimal selling prices, helping shop owners set competitive rates effortlessly.

### 🏢 Core Management
* **📊 Interactive Dashboard:** Real-time visualization of sales, stock levels, and revenue using Chart.js.
* **🛒 Point of Sale (POS):** Fast billing interface with barcode support, instant stock deduction, and receipt generation.
* **🔐 Role-Based Access Control (RBAC):** Secure environment with distinct permissions for **Owners**, **Managers**, and **Staff**.

### ☁️ Modern Cloud Architecture
* **Database:** Serverless PostgreSQL on **Neon.tech**.
* **Media:** Cloudinary for optimized product image handling.
* **Deployment:** High-performance edge deployment on **Vercel**.
* **Notifications:** Automated low-stock email alerts via Nodemailer (SMTP).

---

## 🛠️ Tech Stack

**Frontend:**
* HTML5, CSS3, JavaScript
* EJS (Templating)
* Chart.js (Data Visualization)

**Backend:**
* Node.js & Express.js
* **AI Integration:** Google Gemini API
* PostgreSQL (Neon Console)

**DevOps & Tools:**
* **Auth:** Passport.js (Google OAuth 2.0 & Local)
* **Hosting:** Vercel
* **Storage:** Cloudinary
* **Version Control:** Git & GitHub

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
* Node.js (v18 or higher)
* npm
* PostgreSQL Database

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/dileep812/smart-inventory.git](https://github.com/dileep812/smart-inventory.git)
    cd smart-inventory
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add the following keys:
    ```env
    # Server Configuration
    PORT=3000
    NODE_ENV=development
    
    # Session Security
    SESSION_SECRET=your_super_secret_key
    
    # Database (Neon or Local)
    DATABASE_URL=postgres://user:pass@ep-host.neon.tech/dbname?sslmode=require
    
    # AI Configuration (Gemini)
    GEMINI_API_KEY=your_gemini_api_key
    
    # Cloudinary (Image Storage)
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    
    # Email Service (SMTP)
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=465
    SMTP_USER=your_email@gmail.com
    SMTP_PASS=your_app_specific_password
    
    # Google OAuth
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
    ```

4.  **Run the App**
    ```bash
    npm start
    ```


## 👤 Author

**Dileep Yarramneni**

* **Portfolio:** [LinkedIn](https://www.linkedin.com/in/dileep-yarramneni-0583b728a/)
* **GitHub:** [@dileep812](https://github.com/dileep812)
* **Email:** dileep.y23@iiits.in

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
