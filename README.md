# Personal Portfolio Story

Hi, I am **Krish Lakhani**.

This file is my personal project narrative: who I am, what this portfolio does, and exactly how I built it.

## About Me

I am a **Machine Learning Engineer and Data Scientist** with strong full-stack development skills.

I enjoy building practical products that combine:
- clean frontend experiences
- reliable backend APIs
- AI/ML intelligence
- creative interaction and visual polish

### Quick Profile

- Name: Krish Lakhani
- Email: krishlakhani46767@gmail.com
- Phone: +91 8928591979
- LinkedIn: https://www.linkedin.com/in/krishlakhani19/
- GitHub: https://github.com/Krish-Lakhani19
- Location: Mumbai, Maharashtra, India

## Project Vision

I wanted my portfolio to feel:
- interactive, not static
- modern, responsive, and animated
- technically strong (frontend + backend)
- personal and memorable
- deployable without complexity

So I built a portfolio that is not just a landing page, but a complete mini product.

## What This Website Includes

### Frontend

- Animated and responsive UI
- Creative custom loading experience
- Global interactive 3D background scene
- Theme switching
- Scroll reveal transitions
- Contact section with icon-based details
- Chatbot section (KrishGPT)

### Backend

- Node.js HTTP server without heavy framework overhead
- API routes for health, profile, GitHub projects, contact, and chatbot
- Contact data persistence
- Rate limiting for contact endpoint
- Real-time contact email notifications (Resend)

### AI/Knowledge Layer

KrishGPT is grounded on multiple sources:
- profile data
- extracted resume data
- LinkedIn profile data
- GitHub profile and repositories

It uses retrieval-style relevance scoring to answer broad questions about me.

## How I Developed This Website (Step-by-Step)

1. **Scaffolded project from scratch**
   - created `public/` and `data/`
   - added server and static asset structure

2. **Built backend core**
   - static file serving
   - API endpoints
   - validation and safe request handling

3. **Designed the UI system**
   - defined typography, colors, and visual style
   - added reusable card/button/layout patterns

4. **Added interactions and animations**
   - reveal animations
   - constellation canvas motion
   - card tilt interaction
   - persistent 3D background scene

5. **Implemented chatbot**
   - started with rule-based response system
   - upgraded to retrieval-based multi-source grounding

6. **Integrated my profile data**
   - contact, links, skills, highlights, resume-derived data

7. **Added production-ready contact notifications**
   - Resend-based real-time email sending
   - secure environment variable handling
   - sanitized error responses

8. **Hardened security and privacy**
   - `.env` loading and secret isolation
   - `.gitignore` secret patterns
   - redacted server logs

9. **Prepared deployment documentation**
   - free platform options
   - practical run and deploy steps

## Architecture at a Glance

- Frontend: HTML + CSS + Vanilla JS
- Backend: Node.js (`http`, `https`, `fs`, `path`)
- Storage: JSON/text files in `data/`
- Email: Resend API
- Knowledge sources for chatbot: local structured + extracted files

## Main Files I Built

- `server.js` - backend APIs + security + notification + chatbot retrieval
- `public/index.html` - page structure and sections
- `public/styles.css` - visual system and animations
- `public/app.js` - frontend logic and API integration
- `data/profile.json` - personal profile data
- `data/resume_profile.json` - structured resume knowledge
- `data/resume_merged.txt` - extracted resume text
- `data/linkedin_profile.json` - LinkedIn knowledge
- `data/github_profile.json` + `data/github_repos.json` - GitHub knowledge cache

## What I Learned While Building This

- Great UX needs both visual craft and technical reliability.
- Chatbots become useful only when grounded in real source data.
- Security should be built into the workflow from day one, not added later.
- Even a portfolio can be engineered like a serious production app.

## Future Improvements I Plan

- Admin dashboard for updating profile content
- Semantic/vector retrieval for even better chatbot answers
- Analytics dashboard for contact and visitor insights
- CI/CD pipeline with automated health checks
- Richer storytelling sections for project case studies

## Final Note

This website represents my style as an engineer:
**creative frontend + solid backend + practical AI + deployment-ready execution.**

