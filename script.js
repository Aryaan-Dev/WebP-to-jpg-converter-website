document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const previewContainer = document.getElementById('preview-container');
    const loader = document.getElementById('loader');
    const actionButtons = document.getElementById('action-buttons');
    const downloadZipBtn = document.getElementById('download-zip-btn');
    const clearBtn = document.getElementById('clear-btn');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('quality-value');

    let convertedFiles = [];

    browseBtn.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        handleFiles(files);
    });

    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = qualitySlider.value;
    });

    async function handleFiles(files) {
        const webpFiles = Array.from(files).filter(file => file.type === 'image/webp');

        if (webpFiles.length === 0) {
            alert('Please upload WebP files only.');
            return;
        }

        loader.style.display = 'block';
        actionButtons.style.display = 'none';
        previewContainer.innerHTML = '';
        convertedFiles = [];

        const processingPromises = webpFiles.map(async (file) => {
            try {
                const qualityValue = parseInt(qualitySlider.value, 10);
                const quality = qualityValue / 100;

                let options = {
                    useWebWorker: true,
                };

                if (qualityValue === 100) {
                    options.maxSizeMB = file.size / 1024 / 1024;
                    options.maxWidthOrHeight = undefined;
                } else {
                    options.maxSizeMB = Math.pow(quality, 2) * 10; 
                    options.maxWidthOrHeight = 1920;
                }

                const compressedFile = await imageCompression(file, options);
                const jpgBlob = await convertToJpg(compressedFile, quality);
                const newFileName = file.name.replace(/\.webp$/, '.jpg');
                
                return { blob: jpgBlob, name: newFileName, size: jpgBlob.size };
            } catch (error) {
                console.error('Error processing file:', error);
                alert(`Failed to process ${file.name}.`);
                return null;
            }
        });

        const results = await Promise.all(processingPromises);
        convertedFiles = results.filter(file => file !== null);

        const fragment = document.createDocumentFragment();
        for (const file of convertedFiles) {
            const previewCard = createPreviewCard(file.blob, file.name, file.size);
            fragment.appendChild(previewCard);
        }
        previewContainer.appendChild(fragment);

        loader.style.display = 'none';
        if (convertedFiles.length > 0) {
            actionButtons.style.display = 'flex';
        }
    }

    function convertToJpg(file, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob(resolve, 'image/jpeg', quality);
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function createPreviewCard(blob, name, size) {
        const previewCard = document.createElement('div');
        previewCard.className = 'preview-card glass-card';

        const img = document.createElement('img');
        const objectURL = URL.createObjectURL(blob);
        img.src = objectURL;

        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <p><strong class="file-name">${name}</strong></p>
            <p>Size: ${(size / 1024).toFixed(2)} KB</p>
            <p>Format: JPG</p>
        `;

        const downloadBtn = document.createElement('a');
        downloadBtn.href = objectURL;
        downloadBtn.download = name;
        downloadBtn.className = 'btn btn-small';
        downloadBtn.textContent = 'Download JPG';

        previewCard.appendChild(img);
        previewCard.appendChild(fileInfo);
        previewCard.appendChild(downloadBtn);

        return previewCard;
    }

    downloadZipBtn.addEventListener('click', () => {
        const zip = new JSZip();
        convertedFiles.forEach(file => {
            zip.file(file.name, file.blob);
        });

        zip.generateAsync({ type: 'blob' }).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'converted_images.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });

    clearBtn.addEventListener('click', () => {
        previewContainer.innerHTML = '';
        actionButtons.style.display = 'none';
        convertedFiles = [];
        fileInput.value = '';
    });

    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    const contactForm = document.querySelector('.contact-form form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                alert('Please fill in all fields.');
                return;
            }

            const templateParams = {
                name: name,
                email: email,
                message: message,
            };

            emailjs.init(EMAILJS_PUBLIC_KEY);

            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                .then(() => {
                    alert('Message sent successfully!');
                    contactForm.reset();
                }, (err) => {
                    console.error('EmailJS error:', err);
                    alert('Failed to send message. Please try again later.');
                });
        });
    }
});
