# 🚀 Portfolio Pro - Professional Portfolio Builder for Tech Professionals

<div align="center">
  
  [![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
  [![Astro](https://img.shields.io/badge/Astro-Powered-FF5D01?style=for-the-badge&logo=astro)](https://astro.build/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-Styled-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
  [![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)

  [![GitHub stars](https://img.shields.io/github/stars/jleboube/ProfessionalProfile?style=social)](https://github.com/jleboube/ProfessionalProfile/stargazers)
  [![GitHub forks](https://img.shields.io/github/forks/jleboube/ProfessionalProfile?style=social)](https://github.com/jleboube/ProfessionalProfile/network/members)
  [![GitHub issues](https://img.shields.io/github/issues/jleboube/ProfessionalProfile)](https://github.com/jleboube/ProfessionalProfile/issues)
  [![GitHub pull requests](https://img.shields.io/github/issues-pr/jleboube/ProfessionalProfile)](https://github.com/jleboube/ProfessionalProfile/pulls)
  [![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
  <!-- [![License](https://img.shields.io/github/license/jleboube/ProfessionalProfile)](LICENSE) -->
  
  **Transform your professional journey into a stunning digital portfolio in minutes!**
  
  [Demo](https://goprores.com) • [Features](#key-features) • [Quick Start](#quick-start) • [Roadmap](#roadmap)
  
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/muscl3n3rd)

</div>

---

## ✨ Why Portfolio Pro?

Built by tech professionals for tech professionals, Portfolio Pro is the ultimate solution for creating a compelling online presence without the hassle of building from scratch. Whether you're a software engineer, data scientist, DevOps specialist, or any tech professional, showcase your expertise with style.

# 🎯 Key Features

### 🎨 **Beautiful, Responsive Design**
- **Multiple Color Themes** - Ocean Blue, Forest Green, Sunset Orange, Royal Purple
- **Dark/Light Mode** - Automatic theme switching based on user preference
- **Mobile-First Design** - Looks stunning on all devices
- **Performance Optimized** - Lightning-fast load times with Astro

### 🛠️ **Powerful Admin Panel**
- **Intuitive Setup Wizard** - Get started in under 5 minutes with our guided questionnaire
  - Personal information configuration
  - Social media links (GitHub, LinkedIn)
  - Blog enablement options
  - Professional photo upload
- **Drag & Drop Media Library** - Easily manage and organize your images
- **Live Preview** - See changes in real-time
- **Secure Authentication** - Protected admin access

### 📝 **Professional Features**
- **Dynamic Resume Section**
  - Professional Experience tracking
  - Education history
  - Awards & Recognition
  - Chronological timeline display
- **Project Showcase**
  - Featured image support
  - Live demo links
  - Source code integration
  - Detailed descriptions
- **Blog Platform** (Optional)
  - Markdown support
  - Tag system
  - Draft/Published states
  - SEO optimized
- **GitHub Integration**
  - Contribution graph display
  - Repository statistics
- **Contact Section**
  - Professional email integration
  - Social media links with icons
  - Location display

### 🎯 **Smart Features**
- **"My Technical Path" Summary** - AI-style intelligent summary of your professional journey
- **Responsive Project Grid** - Automatically centers incomplete rows for perfect aesthetics
- **Session-Based Security** - Secure token generation for admin access
- **Data Persistence** - Docker volume mapping ensures your data is never lost

# 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- A domain (optional, for production)
- Your professional photos and content ready

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/portfolio-pro.git
cd portfolio-pro
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env and set ADMIN_USER and ADMIN_PASS
```

3. **Start with Docker Compose**
```bash
docker compose up --build -d
```

4. **Access your portfolio**
- Main Site: `http://localhost:3003`
- Admin Panel: `http://localhost:6900/admin`

5. **Complete Setup Wizard**
- Navigate to admin panel
- Follow the intuitive setup questionnaire
- Add your professional details
- Upload your photo
- Start adding projects and experience!

### 🔧 Configuration

The setup wizard will guide you through:
- ✅ Personal branding (name, title, bio)
- ✅ Professional photo upload
- ✅ Contact information
- ✅ Social media profiles
- ✅ Blog preferences
- ✅ Theme selection

## 📊 Architecture

```
portfolio-pro/
├── apps/
│   ├── site/          # Astro-powered main portfolio
│   └── admin/         # Express.js admin panel
├── data/              # Persistent data volume
│   ├── data.json      # Portfolio configuration
│   └── uploads/       # Media library
└── docker-compose.yml # One-command deployment
```

## 🎨 Customization

### Color Themes
Switch between professionally designed color schemes:
- 🌊 **Ocean** - Professional blue tones
- 🌲 **Forest** - Calming green palette  
- 🌅 **Sunset** - Warm orange hues
- 👑 **Purple** - Royal purple elegance

### Content Management
- Add unlimited projects
- Create detailed resume entries
- Write engaging blog posts
- Upload high-quality images

## 🚀 Deployment

### Production Deployment

1. **Update environment variables**
```bash
cp .env.example .env
# Edit .env with your domain and credentials
```

2. **Deploy with Docker**
```bash
docker compose -f docker-compose.prod.yml up -d
```

3. **Configure reverse proxy** (nginx example)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
  location / {
    proxy_pass http://localhost:3003;
  }
}
```

# 🗺️ Roadmap

### Coming Soon (Phase 2)
- 📄 **Resume Upload & Parser** - Upload your existing resume during setup to automatically populate experience, education, and awards
- 📊 **Skills Visualization** - Interactive horizontal bar charts to showcase:
  - Technical proficiencies (Python, JavaScript, Java, Kotlin, etc.)
  - Professional competencies (Leadership, Communication, Problem-solving)
  - Customizable skill levels with theme-matched colors
- 🎯 **Analytics Dashboard** - Track portfolio visits and engagement
- 🌍 **Multi-language Support** - Reach a global audience
- 📧 **Contact Form** - Built-in contact form with email notifications
- 🔍 **SEO Enhancements** - Advanced meta tags and structured data

### Future Enhancements
- 📱 Progressive Web App (PWA) support
- 🎨 Custom theme builder
- 📈 Career timeline visualization
- 🤝 Testimonials section
- 📚 Certifications showcase
- 🔗 API integrations (LinkedIn, GitHub stats)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Support

If Portfolio Pro helps you land your dream job or showcase your skills, consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs or requesting features
- 🤝 Contributing to the codebase
- ☕ Buying us a coffee

## 🏆 Built With

- [Astro](https://astro.build/) - The web framework for content-driven websites
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Alpine.js](https://alpinejs.dev/) - Lightweight JavaScript framework
- [Express.js](https://expressjs.com/) - Fast, unopinionated web framework
- [Docker](https://www.docker.com/) - Containerization platform
- [Sharp](https://sharp.pixelplumbing.com/) - High-performance image processing

---

<div align="center">
  
**Ready to showcase your professional journey?**

[Get Started Now](#quick-start) and join hundreds of tech professionals who've transformed their online presence!

Made with ❤️ by tech professionals, for tech professionals

</div>
