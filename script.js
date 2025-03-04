const uploadBox = document.querySelector(".upload-box"),
    fileInput = uploadBox.querySelector("input"),
    widthInput = document.querySelector(".width input"),
    heightInput = document.querySelector(".height input"),
    ratioInput = document.querySelector(".ratio input"),
    downloadBtn = document.querySelector(".download-btn"),
    resetBtn = document.querySelector(".reset-btn"),
    imagePreviews = document.querySelector(".image-previews");

let ogImageRatio;
let images = [];

const loadFiles = (e) => {
    const files = e.target.files;
    if (!files.length) return;

    for (const file of files) {
        if (!file.type.startsWith("image/")) continue;

        if (file.size > 1024 * 1024 * 1000) { // 1GB limit
            alert("ไฟล์ใหญ่เกินไป! เบราว์เซอร์อาจทำงานผิดพลาดได้");
            continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                const imageData = {
                    file: file,
                    image: img,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    originalRatio: img.naturalWidth / img.naturalHeight,
                    previewURL: event.target.result,
                };
                images.push(imageData);
                renderImagePreviews();
                if (images.length === 1) {
                    updateDimensions(imageData);
                }
                document.querySelector(".wrapper").classList.add("active");
            };
        };
        reader.readAsDataURL(file);
    }
};

const updateDimensions = (imageData) => {
    widthInput.value = imageData.width;
    heightInput.value = imageData.height;
    ogImageRatio = imageData.originalRatio;
};

const renderImagePreviews = () => {
    imagePreviews.innerHTML = "";
    images.forEach((imageData) => {
        const previewContainer = document.createElement("div");
        previewContainer.classList.add("preview-container");

        const preview = document.createElement("img");
        preview.src = imageData.previewURL;
        preview.alt = imageData.file.name;
        preview.addEventListener("click", () => {
            updateDimensions(imageData);
        });

        const fileSize = document.createElement("span");
        fileSize.classList.add("file-size");
        fileSize.textContent = `${(imageData.file.size / 1024).toFixed(2)} KB`;

        previewContainer.appendChild(preview);
        previewContainer.appendChild(fileSize);
        imagePreviews.appendChild(previewContainer);
    });
};

widthInput.addEventListener("input", () => {
    if (ratioInput.checked && ogImageRatio) {
        heightInput.value = Math.round(widthInput.value / ogImageRatio);
    }
});

heightInput.addEventListener("input", () => {
    if (ratioInput.checked && ogImageRatio) {
        widthInput.value = Math.round(heightInput.value * ogImageRatio);
    }
});

const resizeAndDownload = async () => {
    const targetKB = parseFloat(document.getElementById("targetSize").value);
    if (isNaN(targetKB) || targetKB <= 0) {
        alert("กรุณากรอกขนาดไฟล์ที่ต้องการ (KB)");
        return;
    }

    for (const imageData of images) {
        let width = parseInt(widthInput.value);
        let height = parseInt(heightInput.value);
        let quality = 1.0;

        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");

        const compressImage = async () => {
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(imageData.image, 0, 0, width, height);

            let low = 0.05, high = 1.0, bestBlob = null;
            let attempts = 0, maxAttempts = 20;

            while (low <= high && attempts < maxAttempts) {
                const mid = (low + high) / 2;
                const blob = await new Promise((resolve) => {
                    canvas.toBlob(resolve, imageData.file.type, mid);
                });

                if (!blob) break;
                const currentKB = blob.size / 1024;

                if (Math.abs(currentKB - targetKB) < 5) {
                    quality = mid;
                    bestBlob = blob;
                    break;
                } else if (currentKB < targetKB) {
                    low = mid + 0.01;
                } else {
                    high = mid - 0.01;
                }
                bestBlob = blob;
                attempts++;
            }

            return bestBlob;
        };

        let finalBlob = await compressImage();

        while (finalBlob && finalBlob.size / 1024 > targetKB && width > 100 && height > 100) {
            width = Math.floor(width * 0.9);
            height = Math.floor(height * 0.9);
            finalBlob = await compressImage();
        }

        if (finalBlob) {
            const url = URL.createObjectURL(finalBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = imageData.file.name.replace(/\.[^/.]+$/, "") + "_resized." + imageData.file.type.split("/")[1];

            document.body.appendChild(a);
            setTimeout(() => {
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 0);
        } else {
            alert("ไม่สามารถบีบอัดให้ถึงขนาดที่กำหนดได้ ลองลดขนาดรูปภาพแทน");
        }
    }
};

const reset = () => {
    images = [];
    imagePreviews.innerHTML = "";
    document.querySelector(".wrapper").classList.remove("active");
    widthInput.value = "";
    heightInput.value = "";
    fileInput.value = "";
    ogImageRatio = null;
};

downloadBtn.addEventListener("click", resizeAndDownload);
fileInput.addEventListener("change", loadFiles);
uploadBox.addEventListener("click", () => fileInput.click());
resetBtn.addEventListener("click", reset);

uploadBox.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadBox.classList.add("highlight");
});

uploadBox.addEventListener("dragleave", () => {
    uploadBox.classList.remove("highlight");
});

uploadBox.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadBox.classList.remove("highlight");
    const dt = event.dataTransfer;
    fileInput.files = dt.files;
    loadFiles(event);
});
