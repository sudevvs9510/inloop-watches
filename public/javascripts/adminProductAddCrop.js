let cropper;
    
    function initCropper(id) {
        const input = document.getElementById(id);
        const canvas = document.getElementById(`show${id}`);
        const file = input.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = function (e) {
                canvas.src = e.target.result;
                document.getElementById(`update${id}`).style.display = 'block';
                if (cropper) {
                    cropper.destroy();
                }

                cropper = new Cropper(canvas, {
                    viewMode: 2,
                });
            };

            reader.readAsDataURL(file);
        } else {
            canvas.src = '';
            if (cropper) {
                cropper.destroy();
            }
        }
    }

    function uploadCroppedImage(id) {
        const canvas = cropper.getCroppedCanvas();
        if (canvas) {
            canvas.toBlob((blob) => {
                const fileName = 'cropped_image.jpg';
                const file = new File([blob], fileName, { type: 'image/jpeg' });
                const input = document.getElementById(id);

                if (DataTransfer && FileList) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    input.files = dataTransfer.files;
                } else {
                    console.error('FileList and DataTransfer are not supported in this browser.');
                }

                const showImg = document.getElementById(`show${id}`);
                showImg.src = URL.createObjectURL(blob);

                cropper.destroy();
                document.getElementById(`update${id}`).style.display = 'none';
            });
        }
    }