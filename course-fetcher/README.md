# Course Fetcher Server 🚀

A powerful web scraping server that fetches course data from 7 major online learning platforms.

## 📚 Supported Platforms

1. **Udemy** - Paid courses with frequent discounts
2. **Coursera** - Professional certificates from top universities
3. **NPTEL** - Free courses from IITs and IISc
4. **edX** - Courses from leading universities worldwide
5. **Skillshare** - Creative and professional skills
6. **Khan Academy** - Free education for all
7. **IBM SkillsBuild** - Free professional development

## 🚂 Railway Deployment (Production)

This backend is designed to run on **Railway** for production deployments, as it handles PDF generation with Puppeteer/Chrome which requires more resources than Netlify serverless functions can provide.

### Required Environment Variables on Railway:

```env
RAILWAY_NIXPACKS_PROVIDERS=node,chrome
FRONTEND_URL=https://your-netlify-app.netlify.app
PORT=4000
```

### Deployment Steps:

1. Create a new Railway project from the GitHub repo
2. Set the environment variables above
3. Railway will automatically run:
   ```bash
   npm install
   npm run build  # Installs Chrome for Puppeteer
   npm start
   ```
4. Get your Railway URL (e.g., `https://your-app.up.railway.app`)
5. Use this URL in your Netlify frontend environment variables

### New Production Endpoints:

- **POST /generate-pdf** - Generate PDFs from HTML content (uses Puppeteer)
- **POST /api/courses** - Fetch courses from multiple platforms
- **GET /api/health** - Health check endpoint

For complete deployment guide, see **NETLIFY_RAILWAY_DEPLOYMENT.md** in the root directory.

## 🔧 Installation

```bash
cd course-fetcher
npm install
```

## 🚀 Usage

### Start the Server

```bash
npm start
```

The server will run on `http://localhost:4000`

### API Endpoints

#### 1. Search Courses

**POST** `/api/courses`

Request body:
```json
{
  "topic": "python"
}
```

Response:
```json
[
  {
    "id": "udemy_0_1234567890",
    "name": "Complete Python Bootcamp",
    "description": "Learn Python by doing...",
    "rating": 4.7,
    "price": "Paid",
    "image": "https://example.com/image.jpg",
    "url": "https://www.udemy.com/course/...",
    "platform": "Udemy"
  }
]
```

#### 2. Health Check

**GET** `/health`

Response:
```json
{
  "status": "OK",
  "message": "Course Fetcher Server is running"
}
```

## 🔗 Integration with Frontend

The CourseContent component in the main app is already integrated with this server:

```typescript
// In app/components/CourseContent.tsx
const response = await fetch('http://localhost:4000/api/courses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ topic: searchQuery.trim() }),
});
```

## 🛠️ Features

- **Multi-platform scraping**: Fetches courses from 7 different platforms simultaneously
- **Fallback mock data**: Returns mock courses if all scrapers fail
- **Error handling**: Graceful error handling for each platform
- **CORS enabled**: Allows requests from your Next.js frontend
- **Detailed logging**: Console logs show progress and errors for debugging

## 📊 Course Data Structure

Each course object contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the course |
| `name` | string | Course title |
| `description` | string | Course description |
| `rating` | number | Course rating (0-5) |
| `price` | string | "Free", "Paid", "Varies", or "Free – Paid" |
| `image` | string | Course thumbnail URL |
| `url` | string | Direct link to the course |
| `platform` | string | Platform name (Udemy, Coursera, etc.) |

## 🔍 Scraping Strategy

Each platform has a dedicated scraper function that:
1. Constructs the search URL with the topic
2. Fetches the HTML content using Axios
3. Parses the HTML using Cheerio (jQuery-like selectors)
4. Extracts course data using multiple fallback selectors
5. Returns formatted course objects

## ⚠️ Important Notes

- **Rate Limiting**: Some platforms may rate-limit requests. The server uses realistic User-Agent headers to minimize detection.
- **Dynamic Content**: Some platforms use JavaScript rendering, which may limit scraping effectiveness.
- **URL Changes**: Platform HTML structures change frequently. Selectors may need updating.
- **Mock Fallback**: If all scrapers fail, the server returns mock data to ensure the frontend always has content.

## 🐛 Debugging

The server provides detailed console output:

```
🚀 Fetching courses for: "python"
🔍 Scraping Udemy for: "python"
✅ Fetched 8 courses from Udemy
🔍 Scraping Coursera for: "python"
✅ Fetched 6 courses from Coursera
...
✨ Total courses found: 42
   📊 Breakdown: Udemy(8) | Coursera(6) | NPTEL(5) | edX(6) | ...
```

## 📝 Configuration

### Port

Change the port in `server.js`:

```javascript
const PORT = process.env.PORT || 4000;
```

### Timeout

Adjust request timeout (milliseconds):

```javascript
const { data } = await axiosInstance.get(url, {
    timeout: 15000  // 15 seconds
});
```

### Course Limits

Modify the slice parameter to change how many courses are fetched per platform:

```javascript
$('.course-card').slice(0, 8)  // Fetch first 8 courses
```

## 🔄 Running with Next.js

Make sure both servers are running:

1. **Course Fetcher**: `cd course-fetcher && npm start` (Port 4000)
2. **Next.js App**: `cd .. && npm run dev` (Port 3000)

## 📦 Dependencies

- **express**: Web server framework
- **axios**: HTTP client for making requests
- **cheerio**: HTML parsing and manipulation
- **cors**: Enable Cross-Origin Resource Sharing

## 🤝 Contributing

When adding new platforms:

1. Create a new `fetch[Platform]Courses` function
2. Add it to the `Promise.all` array in `fetchCourses`
3. Update the console log breakdown
4. Test thoroughly

## 📄 License

ISC
