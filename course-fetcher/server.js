const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

// Enhanced CORS configuration - more permissive for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000',
    ];
    
    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^http:\/\/192\.168\.\d+\.\d+:3000$/.test(origin) ||
                      /^http:\/\/192\.168\.\d+\.\d+:4000$/.test(origin) ||
                      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/.test(origin) ||
                      origin === process.env.NEXT_PUBLIC_APP_URL;
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway in development
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json()); // Parse JSON bodies

// Create an axios instance with custom headers
const axiosInstance = axios.create({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }
});

// Common headers for all requests
const getHeaders = () => ({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
});

// Function to fetch courses from Udemy
const fetchUdemyCourses = async (topic) => {
    const results = [];
    
    try {
        const url = `https://www.udemy.com/courses/search/?q=${encodeURIComponent(topic)}`;
        console.log(`🔍 Scraping Udemy for: "${topic}"`);
        
        const { data } = await axiosInstance.get(url, {
            timeout: 15000
        });

        const $ = cheerio.load(data);

        // Enhanced selectors for Udemy
        $('.course-card, [data-purpose="course-card-container"]').slice(0, 8).each((i, element) => {
            try {
                const name = $(element).find('.course-card__title, [data-purpose="course-title-url"], .ud-heading-md').first().text().trim();
                const description = $(element).find('.course-card__description, [data-purpose="course-headline"]').first().text().trim();
                const ratingText = $(element).find('.course-card__rating, [data-purpose="rating"]').first().text().trim();
                const rating = parseFloat(ratingText) || 4.5;
                const priceText = $(element).find('.course-card__price, [data-purpose="price-text-container"]').first().text().trim();
                const price = priceText && priceText.toLowerCase().includes('free') ? 'Free' : 'Paid';
                const image = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');
                const courseLink = $(element).find('a').first().attr('href');

                if (name && courseLink) {
                    results.push({
                        id: `udemy_${i}_${Date.now()}`,
                        name,
                        description: description || 'Master your skills with hands-on learning',
                        rating,
                        price,
                        image: image || 'https://via.placeholder.com/240x135/5624d0/ffffff?text=Udemy',
                        url: courseLink.startsWith('http') ? courseLink : `https://www.udemy.com${courseLink}`,
                        platform: 'Udemy'
                    });
                }
            } catch (err) {
                console.error('Error parsing Udemy course:', err.message);
            }
        });

        console.log(`✅ Fetched ${results.length} courses from Udemy`);
    } catch (error) {
        console.error(`❌ Error fetching Udemy courses: ${error.response ? error.response.status : error.message}`);
    }

    return results;
};

// Function to fetch courses from Coursera
const fetchCourseraCourses = async (topic) => {
    const results = [];
    
    try {
        const url = `https://www.coursera.org/courses?query=${encodeURIComponent(topic)}`;
        
        console.log(`🔍 Scraping Coursera for: "${topic}"`);
        
        const { data } = await axiosInstance.get(url, {
            timeout: 15000
        });

        const $ = cheerio.load(data);

        // Enhanced selectors for Coursera
        const selectors = [
            '.rc-OfferingCard',
            '.cds-ProductCard-base',
            '[class*="ProductCard"]',
            'li[data-e2e="SearchResultsItem"]',
            '.result-title-container'
        ];

        for (const selector of selectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`✅ Found ${elements.length} Coursera elements with selector: ${selector}`);
                
                elements.slice(0, 8).each((i, element) => {
                    try {
                        const $el = $(element);
                        
                        // Try multiple ways to get course name
                        const name = $el.find('.course-title').text().trim() ||
                                    $el.find('h3').first().text().trim() ||
                                    $el.find('h2').first().text().trim() ||
                                    $el.find('[class*="title"]').first().text().trim() ||
                                    $el.find('a').first().attr('aria-label');
                        
                        // Get description
                        const description = $el.find('.description').text().trim() ||
                                          $el.find('p').first().text().trim() ||
                                          $el.find('[class*="description"]').text().trim();
                        
                        // Get rating
                        const ratingText = $el.find('[class*="rating"]').text().trim();
                        const rating = parseFloat(ratingText) || 4.5;
                        
                        // Get price
                        const priceText = $el.find('.price').text().trim();
                        const price = priceText && priceText.toLowerCase().includes('free') ? 'Free' : 'Paid';
                        
                        // Get course URL
                        const courseLink = $el.find('a').first().attr('href');
                        
                        // Get image
                        const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');

                        if (name && courseLink) {
                            results.push({
                                id: `coursera_${i}_${Date.now()}`,
                                name,
                                description: description || 'Professional course from top institutions',
                                rating,
                                price,
                                image: image || 'https://via.placeholder.com/240x135?text=Coursera+Course',
                                url: courseLink.startsWith('http') ? courseLink : `https://www.coursera.org${courseLink}`,
                                platform: 'Coursera'
                            });
                        }
                    } catch (err) {
                        console.error('Error parsing Coursera course:', err.message);
                    }
                });
                
                break; // Stop after finding results with first working selector
            }
        }

        console.log(`✅ Fetched ${results.length} courses from Coursera`);
    } catch (error) {
        console.error(`❌ Error fetching Coursera courses: ${error.response ? error.response.status : error.message}`);
    }

    return results;
};

// Function to fetch courses from NPTEL
const fetchNPTELCourses = async (topic) => {
    const results = [];
    
    try {
        const url = `https://nptel.ac.in/courses/search?q=${encodeURIComponent(topic)}`;
        console.log(`🔍 Scraping NPTEL for: "${topic}"`);
        
        const { data } = await axiosInstance.get(url, {
            timeout: 15000
        });

        const $ = cheerio.load(data);

        $('.course-infos, .course-card, [class*="course"]').slice(0, 6).each((i, element) => {
            try {
                const name = $(element).find('.title, h3, h2, .course-title').first().text().trim();
                const description = $(element).find('.description, p').first().text().trim();
                const image = $(element).find('img').attr('src');
                const courseLink = $(element).find('a').first().attr('href');

                if (name && courseLink) {
                    results.push({
                        id: `nptel_${i}_${Date.now()}`,
                        name,
                        description: description || 'Free online course from IITs and IISc',
                        rating: 4.6,
                        price: 'Free',
                        image: image || 'https://via.placeholder.com/240x135/FF6B35/ffffff?text=NPTEL',
                        url: courseLink.startsWith('http') ? courseLink : `https://nptel.ac.in${courseLink}`,
                        platform: 'NPTEL'
                    });
                }
            } catch (err) {
                console.error('Error parsing NPTEL course:', err.message);
            }
        });

        console.log(`✅ Fetched ${results.length} courses from NPTEL`);
    } catch (error) {
        console.error(`❌ Error fetching NPTEL courses: ${error.response ? error.response.status : error.message}`);
    }

    return results;
};

// Function to fetch courses from edX
const fetchEdxCourses = async (topic) => {
    const results = [];
    
    try {
        const url = `https://www.edx.org/course-search?q=${encodeURIComponent(topic)}`;
        console.log(`🔍 Scraping edX for: "${topic}"`);
        
        const { data } = await axiosInstance.get(url, {
            timeout: 15000
        });

        const $ = cheerio.load(data);

        $('.course-card, [class*="CourseCard"], [data-testid="course-card"]').slice(0, 6).each((i, element) => {
            try {
                const name = $(element).find('.card-title, h3, h2, [class*="title"]').first().text().trim();
                const description = $(element).find('.card-subtitle, p, [class*="description"]').first().text().trim();
                const image = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');
                const courseLink = $(element).find('a').first().attr('href');

                if (name && courseLink) {
                    results.push({
                        id: `edx_${i}_${Date.now()}`,
                        name,
                        description: description || 'Learn from leading universities and institutions',
                        rating: 4.7,
                        price: 'Varies',
                        image: image || 'https://via.placeholder.com/240x135/02262B/ffffff?text=edX',
                        url: courseLink.startsWith('http') ? courseLink : `https://www.edx.org${courseLink}`,
                        platform: 'edX'
                    });
                }
            } catch (err) {
                console.error('Error parsing edX course:', err.message);
            }
        });

        console.log(`✅ Fetched ${results.length} courses from edX`);
    } catch (error) {
        console.error(`❌ Error fetching edX courses: ${error.response ? error.response.status : error.message}`);
    }

    return results;
};

// Function to fetch courses from Skillshare
const fetchSkillshareCourses = async (topic) => {
    const results = [];
    
    try {
        const url = `https://www.skillshare.com/browse/${encodeURIComponent(topic)}`;
        console.log(`🔍 Scraping Skillshare for: "${topic}"`);
        
        const { data } = await axiosInstance.get(url, {
            timeout: 15000
        });

        const $ = cheerio.load(data);

        $('.ProjectCard, [class*="class-card"], [data-testid="class-card"]').slice(0, 6).each((i, element) => {
            try {
                const name = $(element).find('.ProjectCard-title, [class*="title"], h3, h2').first().text().trim();
                const description = $(element).find('.ProjectCard-description, p').first().text().trim();
                const image = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');
                const courseLink = $(element).find('a').first().attr('href');

                if (name && courseLink) {
                    results.push({
                        id: `skillshare_${i}_${Date.now()}`,
                        name,
                        description: description || 'Creative learning for curious people',
                        rating: 4.5,
                        price: 'Free – Paid',
                        image: image || 'https://via.placeholder.com/240x135/00FF84/000000?text=Skillshare',
                        url: courseLink.startsWith('http') ? courseLink : `https://www.skillshare.com${courseLink}`,
                        platform: 'Skillshare'
                    });
                }
            } catch (err) {
                console.error('Error parsing Skillshare course:', err.message);
            }
        });

        console.log(`✅ Fetched ${results.length} courses from Skillshare`);
    } catch (error) {
        console.error(`❌ Error fetching Skillshare courses: ${error.response ? error.response.status : error.message}`);
    }

    return results;
};

// Function to fetch courses from Khan Academy
const fetchKhanAcademyCourses = async (topic) => {
    const results = [];
    
    try {
        const url = `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(topic)}`;
        console.log(`🔍 Scraping Khan Academy for: "${topic}"`);
        
        const { data } = await axiosInstance.get(url, {
            timeout: 15000
        });

        const $ = cheerio.load(data);

        $('.content-item, [class*="search-result"]').slice(0, 6).each((i, element) => {
            try {
                const name = $(element).find('.content-title, h3, h2, [class*="title"]').first().text().trim();
                const description = 'Learn subjects from basics to advanced - Free online courses';
                const image = $(element).find('img').attr('src');
                const courseLink = $(element).find('a').first().attr('href');

                if (name && courseLink) {
                    results.push({
                        id: `khan_${i}_${Date.now()}`,
                        name,
                        description,
                        rating: 4.8,
                        price: 'Free',
                        image: image || 'https://via.placeholder.com/240x135/14BF96/ffffff?text=Khan+Academy',
                        url: courseLink.startsWith('http') ? courseLink : `https://www.khanacademy.org${courseLink}`,
                        platform: 'Khan Academy'
                    });
                }
            } catch (err) {
                console.error('Error parsing Khan Academy course:', err.message);
            }
        });

        console.log(`✅ Fetched ${results.length} courses from Khan Academy`);
    } catch (error) {
        console.error(`❌ Error fetching Khan Academy courses: ${error.response ? error.response.status : error.message}`);
    }

    return results;
};

// Function to fetch courses from IBM SkillsBuild
const fetchIBMCourses = async (topic) => {
    const results = [];
    
    try {
        const url = `https://www.ibm.com/skills/learn?q=${encodeURIComponent(topic)}`;
        console.log(`🔍 Scraping IBM SkillsBuild for: "${topic}"`);
        
        const { data } = await axiosInstance.get(url, {
            timeout: 15000
        });

        const $ = cheerio.load(data);

        $('.learn-resource-card, [class*="course-card"]').slice(0, 6).each((i, element) => {
            try {
                const name = $(element).find('.card-title, h3, h2, [class*="title"]').first().text().trim();
                const description = $(element).find('.card-description, p').first().text().trim();
                const image = $(element).find('img').attr('src');
                const courseLink = $(element).find('a').first().attr('href');

                if (name && courseLink) {
                    results.push({
                        id: `ibm_${i}_${Date.now()}`,
                        name,
                        description: description || 'Free professional development from IBM',
                        rating: 4.6,
                        price: 'Free',
                        image: image || 'https://via.placeholder.com/240x135/0F62FE/ffffff?text=IBM',
                        url: courseLink.startsWith('http') ? courseLink : `https://www.ibm.com${courseLink}`,
                        platform: 'IBM SkillsBuild'
                    });
                }
            } catch (err) {
                console.error('Error parsing IBM course:', err.message);
            }
        });

        console.log(`✅ Fetched ${results.length} courses from IBM SkillsBuild`);
    } catch (error) {
        console.error(`❌ Error fetching IBM SkillsBuild courses: ${error.response ? error.response.status : error.message}`);
    }

    return results;
};

// Fallback mock data generator
const generateMockCourses = (topic) => {
    console.log(`⚠️ Using fallback mock data for: "${topic}"`);
    
    const mockCourses = [
        {
            id: `mock_udemy_1`,
            name: `Complete ${topic} Bootcamp: From Zero to Hero`,
            description: `Master ${topic} with hands-on projects and real-world applications. Build a strong foundation and advance your career.`,
            rating: 4.7,
            price: 'Paid',
            image: 'https://via.placeholder.com/240x135/5624d0/ffffff?text=Udemy',
            url: `https://www.udemy.com/topic/${topic.toLowerCase().replace(/\s+/g, '-')}/`,
            platform: 'Udemy'
        },
        {
            id: `mock_udemy_2`,
            name: `${topic} for Beginners: Complete Course 2026`,
            description: `Learn ${topic} step by step with practical examples. Perfect for beginners with no prior experience required.`,
            rating: 4.6,
            price: 'Paid',
            image: 'https://via.placeholder.com/240x135/5624d0/ffffff?text=Udemy',
            url: `https://www.udemy.com/topic/${topic.toLowerCase().replace(/\s+/g, '-')}/`,
            platform: 'Udemy'
        },
        {
            id: `mock_udemy_3`,
            name: `Advanced ${topic}: Professional Techniques`,
            description: `Take your ${topic} skills to the next level. Advanced concepts and industry best practices covered.`,
            rating: 4.8,
            price: 'Paid',
            image: 'https://via.placeholder.com/240x135/5624d0/ffffff?text=Udemy',
            url: `https://www.udemy.com/topic/${topic.toLowerCase().replace(/\s+/g, '-')}/`,
            platform: 'Udemy'
        },
        {
            id: `mock_coursera_1`,
            name: `${topic} Specialization`,
            description: `Professional Certificate from top universities. Master ${topic} with projects reviewed by industry experts.`,
            rating: 4.8,
            price: 'Paid',
            image: 'https://via.placeholder.com/240x135/0056D2/ffffff?text=Coursera',
            url: `https://www.coursera.org/search?query=${encodeURIComponent(topic)}`,
            platform: 'Coursera'
        },
        {
            id: `mock_coursera_2`,
            name: `Introduction to ${topic}`,
            description: `Learn ${topic} fundamentals from world-class instructors. Build a solid foundation with practical assignments.`,
            rating: 4.7,
            price: 'Paid',
            image: 'https://via.placeholder.com/240x135/0056D2/ffffff?text=Coursera',
            url: `https://www.coursera.org/search?query=${encodeURIComponent(topic)}`,
            platform: 'Coursera'
        },
        {
            id: `mock_coursera_3`,
            name: `${topic} for Data Science`,
            description: `Apply ${topic} to real-world data science problems. Earn a certificate from top universities worldwide.`,
            rating: 4.9,
            price: 'Paid',
            image: 'https://via.placeholder.com/240x135/0056D2/ffffff?text=Coursera',
            url: `https://www.coursera.org/search?query=${encodeURIComponent(topic)}`,
            platform: 'Coursera'
        }
    ];
    
    return mockCourses;
};

// Main function to fetch from all platforms
const fetchCourses = async (topic) => {
    console.log(`\n🚀 Fetching courses for: "${topic}"`);
    
    // Fetch from Coursera only
    const courseraCourses = await fetchCourseraCourses(topic);

    // Use Coursera results
    let allCourses = [...courseraCourses];
    
    // Use mock data as fallback if scraping fails completely
    if (allCourses.length === 0) {
        allCourses = generateMockCourses(topic);
    }
    
    console.log(`✨ Total courses found: ${allCourses.length}`);
    console.log(`   📊 All courses from Coursera\n`);
    
    return allCourses;
};

// API endpoint to fetch courses
app.post('/api/courses', async (req, res) => {
    try {
        const { topic } = req.body;
        
        if (!topic || topic.trim().length === 0) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const courses = await fetchCourses(topic.trim());
        
        res.json(courses);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Course Fetcher Server is running' });
});

// Helper function to get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Start the server
app.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log(`\n🚀 Course Fetcher Server Running`);
    console.log(`📍 Host: ${HOST}`);
    console.log(`🔌 Port: ${PORT}`);
    console.log(`\n📡 Local Access: http://localhost:${PORT}`);
    console.log(`📡 Network Access: http://${localIP}:${PORT}`);
    console.log(`\n✅ API Endpoint: POST /api/courses`);
    console.log(`✅ Health Check: GET /api/health\n`);
});
