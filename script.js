const uploadBox = document.querySelector(".upload-box"),
  fileInput = uploadBox.querySelector("input"),
  widthInput = document.querySelector(".width input"),
  heightInput = document.querySelector(".height input"),
  ratioInput = document.querySelector(".ratio input"),
  qualityInput = document.querySelector(".quality input"),
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
        if (images.length === 1) { // อัปเดตขนาดเฉพาะรูปแรก
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
    const preview = document.createElement("img");
    preview.src = imageData.previewURL;
    preview.alt = imageData.file.name;
    preview.addEventListener("click", () => {
      updateDimensions(imageData);
    });
    imagePreviews.appendChild(preview);
  });
};

widthInput.addEventListener("input", () => {
  if (ratioInput.checked && ogImageRatio) { // ตรวจสอบ ogImageRatio
    heightInput.value = Math.round(widthInput.value / ogImageRatio);
  }
});

heightInput.addEventListener("input", () => {
  if (ratioInput.checked && ogImageRatio) { // ตรวจสอบ ogImageRatio
    widthInput.value = Math.round(heightInput.value * ogImageRatio);
  }
});

const resizeAndDownload = async () => {
  const imgQuality = parseFloat(qualityInput.value) / 100;

  if (isNaN(imgQuality) || imgQuality < 0.1 || imgQuality > 1.0) {
    alert("Quality must be between 10 and 100");
    return;
  }

  for (const imageData of images) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = widthInput.value;
    canvas.height = heightInput.value;
    ctx.drawImage(imageData.image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, imageData.file.type, imgQuality);
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = imageData.file.name
      .split(".")
      .slice(0, -1)
      .join(".") +
      "_resized_" +
      new Date().getTime() +
      "." +
      imageData.file.type.split("/")[1];
    a.click();
    URL.revokeObjectURL(a.href);
  }
};

const reset = () => {
  images = [];
  imagePreviews.innerHTML = "";
  document.querySelector(".wrapper").classList.remove("active");
  widthInput.value = "";
  heightInput.value = "";
  fileInput.value = "";
  ogImageRatio = null; // รีเซ็ตอัตราส่วน
};

downloadBtn.addEventListener("click", resizeAndDownload);
fileInput.addEventListener("change", loadFiles);
uploadBox.addEventListener("click", () => fileInput.click());
resetBtn.addEventListener("click", reset);

// Drag and Drop
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