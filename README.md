# 🎓 Web3 Learning Management System (LMS)

A comprehensive, blockchain-integrated Learning Management System built with Next.js, FastAPI, and Web3 technologies. This platform enables decentralized learning with NFT certificates, token-based rewards, and AI-powered personalization.

## ✨ Features

### 🎯 **Core Learning Platform**

- **Interactive Courses**: Video lessons, quizzes, and hands-on projects
- **Progress Tracking**: Real-time learning analytics and completion tracking
- **Adaptive Learning**: AI-powered personalized learning paths
- **Multi-Category Support**: Blockchain, AI/ML, Web Development, Filmmaking, 3D Animation, Business

### 🔗 **Web3 Integration**

- **NFT Certificates**: Blockchain-verified course completion certificates
- **Token Rewards**: Earn tokens for course completion and achievements
- **Wallet Integration**: MetaMask and other Web3 wallet support
- **Decentralized Identity**: Blockchain-based user authentication

### 🤖 **AI-Powered Features**

- **Smart Recommendations**: Personalized course suggestions
- **AI Chat Assistant**: 24/7 learning support and Q&A
- **Adaptive Assessments**: Dynamic difficulty adjustment
- **Learning Analytics**: Intelligent progress insights

### 👨‍💼 **Admin Management**

- **User Management**: Comprehensive user and instructor administration
- **Course Management**: Content creation, editing, and publishing tools
- **Analytics Dashboard**: Detailed platform and learning analytics
- **Notification System**: Automated and manual communication tools

## 🛠️ Tech Stack

### **Frontend**

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Context + Zustand
- **Web3**: ethers.js, wagmi
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

### **Backend**

- **API**: FastAPI (Python)
- **Database**: PostgreSQL
- **Authentication**: JWT + OAuth2
- **File Storage**: AWS S3 / Cloudinary
- **Blockchain**: Ethereum, Polygon

### **Infrastructure**

- **Frontend Deployment**: Vercel
- **Backend Deployment**: Railway / Heroku
- **Database**: Supabase / Railway PostgreSQL
- **CDN**: Vercel Edge Network

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **PostgreSQL** (v13 or higher)
- **Git**
- **npm** or **yarn**
- **pip** (Python package manager)

## 🚀 Installation

### 1. **Clone the Repository**

\`\`\`bash
git clone https://github.com/your-username/web3-lms.git
cd web3-lms
\`\`\`

### 2. **Frontend Setup**

\`\`\`bash

# Install dependencies

npm install

# Copy environment variables

cp .env.example .env.local

# Configure environment variables (see Environment Configuration section)

\`\`\`

### 3. **Backend Setup**

\`\`\`bash

# Navigate to backend directory

cd backend

# Create virtual environment

python -m venv venv

# Activate virtual environment

# On Windows:

venv\Scripts\activate

# On macOS/Linux:

source venv/bin/activate

# Install dependencies

pip install -r requirements.txt

# Copy environment variables

cp .env.example .env

# Configure environment variables (see Environment Configuration section)

\`\`\`

### 4. **Database Setup**

\`\`\`bash

# Create PostgreSQL database

createdb web3_lms

# Run migrations (from backend directory)

python -m alembic upgrade head

# Seed initial data

python scripts/seed_data.py
\`\`\`

## ⚙️ Environment Configuration

### **Frontend (.env.local)**

\`\`\`env

# App Configuration

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Web3 LMS"

# API Configuration

NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_VERSION=v1

# Web3 Configuration

NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_INFURA_PROJECT_ID=your_infura_project_id
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id

# Third-party Services

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name

# Analytics

NEXT_PUBLIC_GA_MEASUREMENT_ID=your_google_analytics_id
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
\`\`\`

### **Backend (.env)**

\`\`\`env

# Database

DATABASE_URL=postgresql://username:password@localhost:5432/web3_lms
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=web3_lms
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password

# Security

SECRET_KEY=your_super_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS

ALLOWED_ORIGINS=["http://localhost:3000", "https://yourdomain.com"]

# Email Configuration

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
FROM_EMAIL=noreply@yourdomain.com

# File Storage

AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_BUCKET_NAME=your_s3_bucket
AWS_REGION=us-east-1

# Blockchain

ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your_project_id
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=your_deployed_contract_address

# Redis (Optional - for caching)

REDIS_URL=redis://localhost:6379

# External APIs

OPENAI_API_KEY=your_openai_api_key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
\`\`\`

## 🏃‍♂️ Running the Application

### **Development Mode**

1. **Start the Backend**:
   \`\`\`bash
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   \`\`\`

2. **Start the Frontend** (in a new terminal):
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### **Production Mode**

1. **Build the Frontend**:
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

2. **Run the Backend**:
   \`\`\`bash
   cd backend
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   \`\`\`

## 🚀 Deployment

### **Frontend Deployment (Vercel)**

1. **Connect to Vercel**:
   \`\`\`bash
   npm install -g vercel
   vercel login
   vercel
   \`\`\`

2. **Configure Environment Variables** in Vercel Dashboard

3. **Deploy**:
   \`\`\`bash
   vercel --prod
   \`\`\`

### **Backend Deployment (Railway)**

1. **Install Railway CLI**:
   \`\`\`bash
   npm install -g @railway/cli
   \`\`\`

2. **Login and Deploy**:
   \`\`\`bash
   railway login
   railway init
   railway up
   \`\`\`

3. **Configure Environment Variables** in Railway Dashboard

### **Database Deployment (Supabase)**

1. **Create Supabase Project**: https://supabase.com
2. **Run Migrations**:
   \`\`\`bash
   supabase db push
   \`\`\`
3. **Update Connection Strings** in environment variables

### **Alternative Deployment Options**

#### **Backend on Heroku**

\`\`\`bash

# Install Heroku CLI

heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
\`\`\`

#### **Database on Railway**

\`\`\`bash
railway add postgresql
railway connect
\`\`\`

## 📚 API Documentation

### **Authentication Endpoints**

\`\`\`http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
\`\`\`

### **User Management**

\`\`\`http
GET /api/v1/users/profile
PUT /api/v1/users/profile
GET /api/v1/users/{user_id}
DELETE /api/v1/users/{user_id}
\`\`\`

### **Course Management**

\`\`\`http
GET /api/v1/courses
POST /api/v1/courses
GET /api/v1/courses/{course_id}
PUT /api/v1/courses/{course_id}
DELETE /api/v1/courses/{course_id}
\`\`\`

### **Enrollment & Progress**

\`\`\`http
POST /api/v1/enrollments
GET /api/v1/enrollments/user/{user_id}
PUT /api/v1/progress/{enrollment_id}
GET /api/v1/progress/{enrollment_id}
\`\`\`

### **Blockchain Integration**

\`\`\`http
POST /api/v1/blockchain/mint-certificate
GET /api/v1/blockchain/certificates/{user_id}
POST /api/v1/blockchain/reward-tokens
GET /api/v1/blockchain/token-balance/{wallet_address}
\`\`\`

## 🧪 Testing

### **Frontend Testing**

\`\`\`bash

# Unit tests

npm run test

# E2E tests

npm run test:e2e

# Coverage report

npm run test:coverage
\`\`\`

### **Backend Testing**

\`\`\`bash

# Unit tests

cd backend
pytest

# With coverage

pytest --cov=app tests/

# Integration tests

pytest tests/integration/
\`\`\`

## 📁 Project Structure

\`\`\`
web3-lms/
├── app/ # Next.js app directory
│ ├── (auth)/ # Authentication pages
│ ├── admin/ # Admin panel
│ ├── courses/ # Course pages
│ ├── dashboard/ # User dashboard
│ └── api/ # API routes
├── components/ # React components
│ ├── ui/ # shadcn/ui components
│ ├── admin/ # Admin-specific components
│ └── course/ # Course-related components
├── lib/ # Utility libraries
│ ├── services/ # API service functions
│ ├── contexts/ # React contexts
│ └── utils/ # Helper functions
├── backend/ # FastAPI backend
│ ├── routers/ # API route handlers
│ ├── models/ # Database models
│ ├── middleware/ # Custom middleware
│ ├── utils/ # Backend utilities
│ └── database/ # Database configuration
├── scripts/ # Database scripts
├── public/ # Static assets
└── docs/ # Documentation
\`\`\`

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the Repository**
2. **Create a Feature Branch**:
   \`\`\`bash
   git checkout -b feature/amazing-feature
   \`\`\`
3. **Make Your Changes**
4. **Run Tests**:
   \`\`\`bash
   npm run test
   cd backend && pytest
   \`\`\`
5. **Commit Your Changes**:
   \`\`\`bash
   git commit -m "Add amazing feature"
   \`\`\`
6. **Push to Branch**:
   \`\`\`bash
   git push origin feature/amazing-feature
   \`\`\`
7. **Open a Pull Request**

### **Development Guidelines**

- Follow the existing code style and conventions
- Write comprehensive tests for new features
- Update documentation for any API changes
- Use semantic commit messages
- Ensure all tests pass before submitting PR

## 🐛 Troubleshooting

### **Common Issues**

#### **Frontend Issues**

**Build Errors**:
\`\`\`bash

# Clear Next.js cache

rm -rf .next
npm run build
\`\`\`

**Module Not Found**:
\`\`\`bash

# Reinstall dependencies

rm -rf node_modules package-lock.json
npm install
\`\`\`

#### **Backend Issues**

**Database Connection**:
\`\`\`bash

# Check PostgreSQL status

pg_ctl status

# Restart PostgreSQL

sudo service postgresql restart
\`\`\`

**Migration Issues**:
\`\`\`bash

# Reset migrations

alembic downgrade base
alembic upgrade head
\`\`\`

#### **Web3 Integration**

**Wallet Connection Issues**:

- Ensure MetaMask is installed and unlocked
- Check network configuration
- Verify contract addresses

**Transaction Failures**:

- Check gas fees and limits
- Verify wallet has sufficient balance
- Ensure correct network selection

### **Performance Optimization**

1. **Frontend Optimization**:
   - Enable Next.js image optimization
   - Implement proper caching strategies
   - Use dynamic imports for large components

2. **Backend Optimization**:
   - Implement database indexing
   - Use Redis for caching
   - Optimize database queries

3. **Database Optimization**:
   - Regular VACUUM and ANALYZE
   - Monitor query performance
   - Implement connection pooling

## 📞 Support

### **Getting Help**

- **Documentation**: Check this README and inline code comments
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: contact@yourdomain.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing React framework
- **FastAPI** for the high-performance Python API framework
- **shadcn/ui** for the beautiful component library
- **Vercel** for seamless deployment platform
- **Supabase** for the developer-friendly database platform

---

# dca-lms

# lms-v3
