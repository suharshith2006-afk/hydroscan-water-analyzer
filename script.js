document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');

    navLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId) {
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    const targetPosition = targetSection.offsetTop - 40; 
                    window.scrollTo({
                        top: targetId === '#home' ? 0 : targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
            
            if (window.innerWidth <= 992) {
                const navMenu = document.querySelector('.nav-menu');
                const menuIcon = document.getElementById('mobile-menu-btn').querySelector('i');
                if (navMenu && menuIcon) {
                    navMenu.classList.remove('active');
                    menuIcon.className = 'fa-solid fa-bars';
                }
            }
        });
    });

    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 120; 

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            
            if (navMenu.classList.contains('active')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });
    }

    const scanBtn = document.getElementById('start-scan-btn');
    const videoStream = document.getElementById('camera-stream');
    const dropletIcon = document.getElementById('droplet-placeholder');
    const sampleStatus = document.querySelector('.status-tag');
    
    const metricFill = document.querySelector('.metric-bar-fill');
    const metricValueText = document.querySelector('.metric-value');

    const turbidityBar = document.getElementById('turbidity-bar');
    const turbidityVal = document.getElementById('turbidity-val');
    const phBar = document.getElementById('ph-bar');
    const phVal = document.getElementById('ph-val');

    let analysisInterval;

    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            try {
                const constraints = {
                    video: { 
                        facingMode: "environment",
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                if (videoStream) {
                    videoStream.srcObject = stream;
                    videoStream.style.display = 'block';
                }
                
                if (dropletIcon) {
                    dropletIcon.style.opacity = '0.2';
                }
                
                if (sampleStatus) {
                    sampleStatus.textContent = "ANALYZING...";
                    sampleStatus.style.color = "#Eab308";
                }

                const homeSection = document.getElementById('home');
                if (homeSection) {
                    homeSection.scrollIntoView({ behavior: 'smooth' });
                }

                if (analysisInterval) clearInterval(analysisInterval);

                const hiddenCanvas = document.createElement('canvas');
                const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });

                analysisInterval = setInterval(() => {
                    if (videoStream && videoStream.readyState === videoStream.HAVE_ENOUGH_DATA) {
                        hiddenCanvas.width = 100;
                        hiddenCanvas.height = 100;
                        
                        ctx.drawImage(videoStream, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
                        
                        const frameData = ctx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
                        const pixels = frameData.data;
                        
                        let totalRed = 0, totalGreen = 0, totalBlue = 0;
                        
                        for (let i = 0; i < pixels.length; i += 4) {
                            totalRed += pixels[i];
                            totalGreen += pixels[i+1];
                            totalBlue += pixels[i+2];
                        }
                        
                        let pixelCount = pixels.length / 4;
                        let avgR = totalRed / pixelCount;
                        let avgG = totalGreen / pixelCount;
                        let avgB = totalBlue / pixelCount;

                        let shiftMetric = Math.abs(avgR - avgG) / 255;
                        let threatPercentage = (shiftMetric * 100).toFixed(2);

                        if (threatPercentage < 0.05) threatPercentage = 0.02; 
                        if (threatPercentage > 100) threatPercentage = 100;

                        if (metricFill) {
                            metricFill.style.width = `${threatPercentage}%`;
                            
                            if (threatPercentage > 15) {
                                metricFill.style.backgroundColor = '#Ef4444'; 
                                sampleStatus.textContent = "ALERT";
                                sampleStatus.style.color = "#Ef4444";
                            } else if (threatPercentage > 5) {
                                metricFill.style.backgroundColor = '#Eab308'; 
                                sampleStatus.textContent = "WARNING";
                                sampleStatus.style.color = "#Eab308";
                            } else {
                                metricFill.style.backgroundColor = '#1AB7D9'; 
                                sampleStatus.textContent = "OPTIMAL";
                                sampleStatus.style.color = "#10B981";
                            }
                        }

                        if (metricValueText) {
                            metricValueText.textContent = `${threatPercentage}% (${sampleStatus.textContent})`;
                        }

                        let brightness = (avgR + avgG + avgB) / 3;
                        let turbidityPercentage = (100 - (brightness / 255 * 100));
                        let ntuValue = (turbidityPercentage * 0.1).toFixed(2);
                        
                        if (turbidityBar) turbidityBar.style.width = `${Math.max(turbidityPercentage, 5)}%`;
                        if (turbidityVal) turbidityVal.textContent = `${ntuValue} NTU`;

                        let calculatedPh = 7.0;
                        if (avgR > avgB) {
                            calculatedPh = (7.0 - (avgR - avgB) / 255 * 3).toFixed(1);
                        } else {
                            calculatedPh = (7.0 + (avgB - avgR) / 255 * 3).toFixed(1);
                        }
                        if (calculatedPh < 0) calculatedPh = 0;
                        if (calculatedPh > 14) calculatedPh = 14;

                        let phPosition = (calculatedPh / 14 * 100);
                        if (phBar) phBar.style.width = `${phPosition}%`;
                        if (phVal) phVal.textContent = `${calculatedPh} pH`;
                    }
                }, 1000);

            } catch (err) {
                console.error(err);
                alert("Camera access is required to run the optical analysis matrix prototype.");
            }
        });
    }
});