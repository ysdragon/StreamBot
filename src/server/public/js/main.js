
const themeToggle = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(isDark) {
	document.body.classList.toggle('dark-mode', isDark);
	const icon = themeToggle.querySelector('i');
	if (icon) {
		icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
	}
}

setTheme(prefersDarkScheme.matches);

themeToggle.addEventListener('click', () => {
	document.body.classList.toggle('dark-mode');
	setTheme(document.body.classList.contains('dark-mode'));
});

prefersDarkScheme.addEventListener('change', (e) => setTheme(e.matches));

class ToastManager {
	constructor() {
		this.container = document.getElementById('toast-container');
		this.toasts = new Set();
		this.queue = [];
		this.maxToasts = 5;
		this.defaultDuration = 4000;
		this.init();
	}

	init() {
		if (!this.container) {
			console.error('Toast container not found');
			return;
		}

		
		if (!this.container) {
			this.container = document.createElement('div');
			this.container.id = 'toast-container';
			this.container.className = 'toast-container';
			this.container.setAttribute('role', 'region');
			this.container.setAttribute('aria-label', 'Notifications');
			this.container.setAttribute('aria-live', 'polite');
			document.body.appendChild(this.container);
		}
	}

	getIcon(type) {
		const icons = {
			success: 'fas fa-check-circle',
			error: 'fas fa-exclamation-circle',
			warning: 'fas fa-exclamation-triangle',
			info: 'fas fa-info-circle'
		};
		return icons[type] || icons.info;
	}

	getAriaRole(type) {
		return type === 'error' ? 'alert' : 'status';
	}

	createToast(message, type = 'info', title = '', duration = null) {
		const toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

		const toast = document.createElement('div');
		toast.id = toastId;
		toast.className = `toast ${type}`;
		toast.setAttribute('role', this.getAriaRole(type));
		toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
		toast.setAttribute('aria-atomic', 'true');

		
		if (document.body.classList.contains('dark-mode')) {
			toast.classList.add('dark-mode');
		}

		const content = `
			<div class="toast-icon">
				<i class="${this.getIcon(type)}" aria-hidden="true"></i>
			</div>
			<div class="toast-content">
				${title ? `<div class="toast-title">${title}</div>` : ''}
				<div class="toast-message">${message}</div>
			</div>
			<button class="toast-close" onclick="toastManager.removeToast('${toastId}')" aria-label="Close notification">
				<i class="fas fa-times" aria-hidden="true"></i>
			</button>
			<div class="toast-progress" style="width: 100%"></div>
		`;

		toast.innerHTML = content;
		this.container.appendChild(toast);

		
		setTimeout(() => {
			toast.classList.add('show');
		}, 10);

		
		const progressBar = toast.querySelector('.toast-progress');
		if (progressBar) {
			progressBar.style.transition = `width ${duration || this.defaultDuration}ms linear`;
			setTimeout(() => {
				progressBar.style.width = '0%';
			}, 10);
		}

		
		const autoRemove = setTimeout(() => {
			this.removeToast(toastId);
		}, duration || this.defaultDuration);

		
		const toastObj = {
			id: toastId,
			element: toast,
			timer: autoRemove
		};

		this.toasts.add(toastObj);

		
		this.manageQueue();

		return toastId;
	}

	removeToast(toastId) {
		const toast = document.getElementById(toastId);
		if (!toast) return;

		
		const toastObj = Array.from(this.toasts).find(t => t.id === toastId);
		if (toastObj) {
			clearTimeout(toastObj.timer);
			this.toasts.delete(toastObj);
		}

		
		toast.classList.add('removing');
		setTimeout(() => {
			if (toast.parentNode) {
				toast.parentNode.removeChild(toast);
			}
		}, 300);

		
		this.processQueue();
	}

	manageQueue() {
		
		if (this.toasts.size >= this.maxToasts) {
			const oldestToast = this.toasts.values().next().value;
			if (oldestToast) {
				this.removeToast(oldestToast.id);
			}
		}
	}

	processQueue() {
		
		if (this.queue.length > 0 && this.toasts.size < this.maxToasts) {
			const nextToast = this.queue.shift();
			this.createToast(...nextToast);
		}
	}

	
	success(message, title = 'Success', duration = null) {
		return this.createToast(message, 'success', title, duration);
	}

	error(message, title = 'Error', duration = null) {
		return this.createToast(message, 'error', title, duration);
	}

	warning(message, title = 'Warning', duration = null) {
		return this.createToast(message, 'warning', title, duration);
	}

	info(message, title = 'Info', duration = null) {
		return this.createToast(message, 'info', title, duration);
	}
}


const toastManager = new ToastManager();


function showToast(message, type = 'info', title = '', duration = null) {
	return toastManager.createToast(message, type, title, duration);
}


function showSuccessToast(message, title = 'Success', duration = null) {
	return toastManager.success(message, title, duration);
}

function showErrorToast(message, title = 'Error', duration = null) {
	return toastManager.error(message, title, duration);
}

function showWarningToast(message, title = 'Warning', duration = null) {
	return toastManager.warning(message, title, duration);
}

function showInfoToast(message, title = 'Info', duration = null) {
	return toastManager.info(message, title, duration);
}

function copyFileName(name) {
	// Try modern clipboard API first
	if (navigator.clipboard && window.isSecureContext) {
		navigator.clipboard.writeText(name).then(() => {
			showSuccessToast(name + " copied to clipboard!", "Copied!");
		}).catch(async err => {
			console.error('Failed to copy text: ', err);
			await fallbackCopyTextToClipboard(name);
		});
	} else {
		fallbackCopyTextToClipboard(name);
	}
}

async function fallbackCopyTextToClipboard(text) {
	const textArea = document.createElement("textarea");
	textArea.value = text;

	// Avoid scrolling to bottom
	textArea.style.top = "0";
	textArea.style.left = "0";
	textArea.style.position = "fixed";
	textArea.style.opacity = "0";

	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();

	try {
		// Use modern clipboard API if available, even in fallback
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			showSuccessToast(text + " copied to clipboard!", "Copied!");
		} else {
			// Final fallback: select and inform user to copy manually
			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(textArea);
			selection.removeAllRanges();
			selection.addRange(range);
			textArea.setSelectionRange(0, text.length);

			// Show info message that user needs to manually copy
			showInfoToast("Text selected - please copy manually (Ctrl+C or Cmd+C)", "Manual Copy");
		}
	} catch (err) {
		console.error('Fallback: Could not copy text: ', err);
		showErrorToast("Failed to copy to clipboard", "Copy Error");
	}

	document.body.removeChild(textArea);
}


function initLazyLoading() {
	if ('IntersectionObserver' in window) {
		const imageObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const img = entry.target;
					img.classList.add('loaded');
					observer.unobserve(img);
				}
			});
		});

		
		document.querySelectorAll('img[loading="lazy"]').forEach(img => {
			imageObserver.observe(img);
		});
	} else {
		
		document.querySelectorAll('img[loading="lazy"]').forEach(img => {
			img.classList.add('loaded');
		});
	}
}


document.addEventListener('DOMContentLoaded', initLazyLoading);


function initFormLoadingStates() {
	
	const localForm = document.getElementById('localUploadForm');
	const localBtn = document.getElementById('localUploadBtn');
	const localSpinner = localBtn?.querySelector('.spinner-border');

	if (localForm && localBtn && localSpinner) {
		localForm.addEventListener('submit', function (e) {
			localBtn.disabled = true;
			localSpinner.classList.remove('d-none');
			localBtn.querySelector('span:not(.spinner-border)').textContent = 'Uploading...';
		});
	}

	
	const remoteForm = document.getElementById('remoteUploadForm');
	const remoteBtn = document.getElementById('remoteUploadBtn');
	const remoteSpinner = remoteBtn?.querySelector('.spinner-border');

	if (remoteForm && remoteBtn && remoteSpinner) {
		remoteForm.addEventListener('submit', function (e) {
			remoteBtn.disabled = true;
			remoteSpinner.classList.remove('d-none');
			remoteBtn.querySelector('span:not(.spinner-border)').textContent = 'Uploading...';
		});
	}
}


function showGlobalLoading(message = 'Loading...') {
	const overlay = document.getElementById('loadingOverlay');
	const text = document.getElementById('loadingText');
	const progress = document.getElementById('progressIndicator');

	if (text) text.textContent = message;
	if (overlay) overlay.classList.add('show');
	if (progress) progress.style.width = '0%';

	
	if (faviconManager) faviconManager.showLoading();
}

function hideGlobalLoading() {
	const overlay = document.getElementById('loadingOverlay');
	const progress = document.getElementById('progressIndicator');

	if (overlay) overlay.classList.remove('show');
	if (progress) progress.style.width = '0%';

	
	if (faviconManager) faviconManager.hideLoading();
}

function updateProgress(percentage) {
	const progress = document.getElementById('progressIndicator');
	if (progress) {
		progress.style.width = Math.min(100, Math.max(0, percentage)) + '%';
	}
}


function validateVideoFile(file) {
	const videoTypes = [
		'video/mp4',
		'video/avi',
		'video/mov',
		'video/quicktime',
		'video/x-msvideo',
		'video/webm',
		'video/mkv',
		'video/x-matroska',
		'video/3gpp',
		'video/x-flv'
	];

	
	if (videoTypes.includes(file.type)) {
		return true;
	}

	
	const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.3gp', '.m4v', '.asf', '.rm', '.vob'];
	const fileName = file.name.toLowerCase();
	const hasVideoExtension = videoExtensions.some(ext => fileName.endsWith(ext));

	return hasVideoExtension;
}


document.addEventListener('DOMContentLoaded', function () {
	initFormLoadingStates();

	
	const localFileInput = document.getElementById('localFileInput');
	if (localFileInput) {
		
		localFileInput.addEventListener('focus', function (e) {
			e.target.classList.add('user-interacted');
		});

		localFileInput.addEventListener('change', function (e) {
			const file = e.target.files[0];
			if (file && !validateVideoFile(file)) {
				showWarningToast('Please select a valid video file (MP4, AVI, MOV, MKV, WebM, etc.)', 'Invalid File Type');
				e.target.value = '';
			}
		});
	}

	
	document.addEventListener('keydown', function (e) {
		const deleteModal = document.getElementById('deleteModal');
		const modal = bootstrap.Modal.getInstance(deleteModal);

		
		if (e.key === 'Escape' && modal && deleteModal.classList.contains('show')) {
			modal.hide();
		}
	});
});


function showDeleteModal(fileName, deleteUrl) {
	const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
	const fileNameElement = document.getElementById('deleteFileName');
	const confirmBtn = document.getElementById('confirmDeleteBtn');

	
	fileNameElement.textContent = fileName;

	
	confirmBtn.href = deleteUrl;

	
	confirmBtn.addEventListener('click', function (e) {
		
		setTimeout(() => {
			
			modal.hide();
		}, 100);
	});

	
	modal.show();
}


function handleDeleteSuccess() {
	const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
	if (modal) {
		modal.hide();
	}
	showSuccessToast('Video file deleted successfully!', 'File Deleted');
	
	setTimeout(() => {
		window.location.reload();
	}, 1500);
}


let localUploadXHR = null;
let remoteUploadXHR = null;


function startLocalUpload() {
	const fileInput = document.getElementById('localFileInput');
	const progressContainer = document.getElementById('localProgressContainer');
	const progressBar = document.getElementById('localProgressBar');
	const progressText = document.getElementById('localProgressText');
	const progressStatus = document.getElementById('localProgressStatus');
	const uploadBtn = document.getElementById('localUploadBtn');
	const cancelBtn = document.getElementById('localCancelBtn');

	if (!fileInput.files[0]) {
		showWarningToast('Please select a file first', 'No File Selected');
		return;
	}

	const file = fileInput.files[0];
	const formData = new FormData();
	formData.append('file', file);

	
	progressContainer.classList.remove('d-none');
	uploadBtn.classList.add('d-none');
	cancelBtn.classList.remove('d-none');

	
	localUploadXHR = new XMLHttpRequest();

	localUploadXHR.upload.addEventListener('progress', function (e) {
		if (e.lengthComputable) {
			const percentComplete = Math.round((e.loaded / e.total) * 100);
			progressBar.style.width = percentComplete + '%';
			progressText.textContent = percentComplete + '%';
			progressStatus.textContent = `Uploading... ${formatFileSize(e.loaded)} / ${formatFileSize(e.total)}`;
		}
	});

	localUploadXHR.addEventListener('load', function () {
		try {
			if (localUploadXHR.status === 200) {
				const response = JSON.parse(localUploadXHR.responseText);
				progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
				progressBar.classList.add('bg-success');
				progressText.textContent = '100%';
				progressStatus.textContent = 'Upload completed successfully!';

				showSuccessToast('File uploaded successfully!', 'Upload Complete');
				setTimeout(() => {
					window.location.reload();
				}, 2000);
			} else {
				showErrorToast('Upload failed. Please try again.', 'Upload Error');
				resetLocalUpload();
			}
		} catch (error) {
			console.error('Error processing upload response:', error);
			showErrorToast('Upload failed due to processing error.', 'Upload Error');
			resetLocalUpload();
		}
	});

	localUploadXHR.addEventListener('error', function () {
		showErrorToast('Upload failed. Please check your connection.', 'Connection Error');
		resetLocalUpload();
	});

	localUploadXHR.open('POST', '/api/upload');
	localUploadXHR.send(formData);
}

function cancelLocalUpload() {
	if (localUploadXHR) {
		localUploadXHR.abort();
		// Clean up event listeners to prevent memory leaks
		localUploadXHR.onload = null;
		localUploadXHR.onerror = null;
		localUploadXHR.upload.onprogress = null;
	}
	resetLocalUpload();
	showInfoToast('Upload cancelled', 'Upload Cancelled');
}

function resetLocalUpload() {
	const progressContainer = document.getElementById('localProgressContainer');
	const progressBar = document.getElementById('localProgressBar');
	const progressText = document.getElementById('localProgressText');
	const progressStatus = document.getElementById('localProgressStatus');
	const uploadBtn = document.getElementById('localUploadBtn');
	const cancelBtn = document.getElementById('localCancelBtn');

	progressContainer.classList.add('d-none');
	progressBar.style.width = '0%';
	progressBar.classList.add('progress-bar-animated', 'progress-bar-striped');
	progressBar.classList.remove('bg-success');
	progressText.textContent = '0%';
	progressStatus.textContent = 'Starting upload...';
	uploadBtn.classList.remove('d-none');
	cancelBtn.classList.add('d-none');

	localUploadXHR = null;
}


function startRemoteUpload() {
	const urlInput = document.getElementById('remoteFileInput');
	const progressContainer = document.getElementById('remoteProgressContainer');
	const progressBar = document.getElementById('remoteProgressBar');
	const progressText = document.getElementById('remoteProgressText');
	const progressStatus = document.getElementById('remoteProgressStatus');
	const uploadBtn = document.getElementById('remoteUploadBtn');
	const cancelBtn = document.getElementById('remoteCancelBtn');

	if (!urlInput.value) {
		showWarningToast('Please enter a valid URL', 'Missing URL');
		return;
	}

	
	progressContainer.classList.remove('d-none');
	uploadBtn.classList.add('d-none');
	cancelBtn.classList.remove('d-none');

	
	let progress = 0;
	const progressInterval = setInterval(() => {
		progress += Math.random() * 15; 

		if (progress >= 90) {
			progress = 90; 
			clearInterval(progressInterval);
		}

		progressBar.style.width = Math.round(progress) + '%';
		progressText.textContent = Math.round(progress) + '%';
		progressStatus.textContent = 'Downloading...';
	}, 500);

	
	const formData = new FormData();
	formData.append('link', urlInput.value);

	remoteUploadXHR = new XMLHttpRequest();

	remoteUploadXHR.addEventListener('load', function () {
		clearInterval(progressInterval);

		try {
			if (remoteUploadXHR.status === 200) {
				const response = JSON.parse(remoteUploadXHR.responseText);
				progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
				progressBar.classList.add('bg-success');
				progressBar.style.width = '100%';
				progressText.textContent = '100%';
				progressStatus.textContent = 'Download completed successfully!';

				showSuccessToast('Remote file downloaded successfully!', 'Download Complete');
				setTimeout(() => {
					window.location.reload();
				}, 2000);
			} else {
				showErrorToast('Download failed. Please check the URL.', 'Download Error');
				resetRemoteUpload();
			}
		} catch (error) {
			console.error('Error processing download response:', error);
			showErrorToast('Download failed due to processing error.', 'Download Error');
			resetRemoteUpload();
		}
	});

	remoteUploadXHR.addEventListener('error', function () {
		clearInterval(progressInterval);
		showErrorToast('Download failed. Please check your connection.', 'Connection Error');
		resetRemoteUpload();
	});

	remoteUploadXHR.open('POST', '/api/remote_upload');
	remoteUploadXHR.send(formData);
}

function cancelRemoteUpload() {
	if (remoteUploadXHR) {
		remoteUploadXHR.abort();
		// Clean up event listeners to prevent memory leaks
		remoteUploadXHR.onload = null;
		remoteUploadXHR.onerror = null;
	}
	resetRemoteUpload();
	showInfoToast('Download cancelled', 'Download Cancelled');
}

function resetRemoteUpload() {
	const progressContainer = document.getElementById('remoteProgressContainer');
	const progressBar = document.getElementById('remoteProgressBar');
	const progressText = document.getElementById('remoteProgressText');
	const progressStatus = document.getElementById('remoteProgressStatus');
	const uploadBtn = document.getElementById('remoteUploadBtn');
	const cancelBtn = document.getElementById('remoteCancelBtn');

	progressContainer.classList.add('d-none');
	progressBar.style.width = '0%';
	progressBar.classList.add('progress-bar-animated', 'progress-bar-striped');
	progressBar.classList.remove('bg-success');
	progressText.textContent = '0%';
	progressStatus.textContent = 'Starting download...';
	uploadBtn.classList.remove('d-none');
	cancelBtn.classList.add('d-none');

	remoteUploadXHR = null;
}


function formatFileSize(bytes) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


class PreviewImageManager {
	constructor() {
		this.init();
	}

	init() {
		this.setupImageLoading();
		this.setupLazyLoading();
	}

	setupImageLoading() {
		const imageContainers = document.querySelectorAll('.image-container');

		imageContainers.forEach((container, index) => {
			const img = container.querySelector('.preview-image');
			const loadingDiv = container.querySelector('.image-loading');
			const errorDiv = container.querySelector('.image-error');

			if (!img) return;

			
			this.showLoadingState(container);

			
			img.addEventListener('load', () => {
				this.showImageState(container);
				img.classList.add('loaded');
			});

			
			img.addEventListener('error', () => {
				this.showErrorState(container);
			});

			
			if (img.complete && img.naturalHeight !== 0) {
				this.showImageState(container);
				img.classList.add('loaded');
			}
		});
	}

	setupLazyLoading() {
		
		if ('IntersectionObserver' in window) {
			const imageObserver = new IntersectionObserver((entries, observer) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						const container = entry.target;
						const img = container.querySelector('.preview-image');

						if (img && !img.src) {
							
							const carouselItem = container.closest('.carousel-item');
							if (carouselItem) {
								const previewUrl = carouselItem.getAttribute('data-preview-url');
								if (previewUrl) {
									img.src = previewUrl;
									this.showLoadingState(container);
								}
							}
						}

						observer.unobserve(container);
					}
				});
			});

			
			document.querySelectorAll('.image-container').forEach(container => {
				imageObserver.observe(container);
			});
		}
	}

	showLoadingState(container) {
		const img = container.querySelector('.preview-image');
		const loadingDiv = container.querySelector('.image-loading');
		const errorDiv = container.querySelector('.image-error');

		if (loadingDiv) loadingDiv.classList.remove('d-none');
		if (loadingDiv) loadingDiv.classList.add('show');
		if (errorDiv) errorDiv.classList.add('d-none');
		if (errorDiv) errorDiv.classList.remove('show');
		if (img) img.style.display = 'none';
	}

	showImageState(container) {
		const img = container.querySelector('.preview-image');
		const loadingDiv = container.querySelector('.image-loading');
		const errorDiv = container.querySelector('.image-error');

		if (loadingDiv) loadingDiv.classList.add('d-none');
		if (loadingDiv) loadingDiv.classList.remove('show');
		if (errorDiv) errorDiv.classList.add('d-none');
		if (errorDiv) errorDiv.classList.remove('show');
		if (img) img.style.display = 'block';
	}

	showErrorState(container) {
		const img = container.querySelector('.preview-image');
		const loadingDiv = container.querySelector('.image-loading');
		const errorDiv = container.querySelector('.image-error');

		if (loadingDiv) loadingDiv.classList.add('d-none');
		if (loadingDiv) loadingDiv.classList.remove('show');
		if (errorDiv) errorDiv.classList.remove('d-none');
		if (errorDiv) errorDiv.classList.add('show');
		if (img) img.style.display = 'none';
	}

	retryLoad(container) {
		const img = container.querySelector('.preview-image');
		const carouselItem = container.closest('.carousel-item');

		if (img && carouselItem) {
			const previewUrl = carouselItem.getAttribute('data-preview-url');
			if (previewUrl) {
				
				img.src = '';
				this.showLoadingState(container);

				
				setTimeout(() => {
					img.src = previewUrl;
				}, 500);
			}
		}
	}
}


const previewImageManager = new PreviewImageManager();


class FaviconManager {
	constructor() {
		this.faviconSvg = '/favicon.svg';
		this.faviconPng = '/favicon-32x32.png';
		this.init();
	}

	init() {
		this.updateFavicon();
		this.setupThemeListener();
		this.setupLoadingListener();
	}

	updateFavicon() {
		const isDark = document.body.classList.contains('dark-mode');
		const favicon = document.querySelector('link[rel="icon"][type="image/svg+xml"]');

		if (favicon) {
			
			const timestamp = Date.now();
			favicon.href = `${this.faviconSvg}?t=${timestamp}`;
		}
	}

	setupThemeListener() {
		
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
					this.updateFavicon();
				}
			});
		});

		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class']
		});
	}

	setupLoadingListener() {
		
		document.body.classList.add('loading');

		
		window.addEventListener('load', () => {
			document.body.classList.remove('loading');
		});

		
		const originalFetch = window.fetch;
		window.fetch = function (...args) {
			document.body.classList.add('loading');
			return originalFetch.apply(this, args).finally(() => {
				
				setTimeout(() => {
					document.body.classList.remove('loading');
				}, 100);
			});
		};
	}

	showLoading() {
		document.body.classList.add('loading');
	}

	hideLoading() {
		document.body.classList.remove('loading');
	}
}

const faviconManager = new FaviconManager();

