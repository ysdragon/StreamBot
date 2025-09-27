import { VideoQueue, QueueItem, MediaSource } from "../types/index.js";
import { MediaService } from "./media.js";
import logger from '../utils/logger.js';

export class QueueService {
	private mediaService: MediaService;
	private queue: VideoQueue;

	constructor() {
		this.mediaService = new MediaService();
		this.queue = {
			items: [],
			currentIndex: -1,
			isPlaying: false
		};
	}

	/**
	 * Add a video to the queue
	 */
	public async addToQueue(
		mediaSource: MediaSource,
		requestedBy: string,
		originalInput?: string
	): Promise<QueueItem> {
		return this.add(
			mediaSource.url,
			mediaSource.title,
			requestedBy,
			mediaSource.type,
			mediaSource.isLive,
			originalInput || mediaSource.url
		);
	}

	/**
	 * Add a media source to the queue
	 */
	public async add(
		url: string,
		title: string,
		requestedBy: string,
		type: 'youtube' | 'twitch' | 'local' | 'url' = 'url',
		isLive: boolean = false,
		originalInput?: string
	): Promise<QueueItem> {
		const queueItem: QueueItem = {
			id: this.generateId(),
			url,
			title,
			type,
			isLive,
			requestedBy,
			addedAt: new Date(),
			originalInput: originalInput || url,
			resolved: originalInput === url,
		};

		this.queue.items.push(queueItem);
		logger.info(`Added to queue: ${title} (requested by ${requestedBy}, resolved: ${queueItem.resolved})`);

		return queueItem;
	}

	/**
	 * Get the next item in the queue
	 */
	getNext(): QueueItem | null {
		if (this.queue.items.length === 0) {
			this.queue.currentIndex = -1;
			return null;
		}

		if (this.queue.currentIndex < this.queue.items.length - 1) {
			this.queue.currentIndex++;
			return this.queue.items[this.queue.currentIndex];
		}

		// No more items, reset currentIndex to -1
		this.queue.currentIndex = -1;
		return null;
	}

	/**
	 * Get the current playing item
	 */
	getCurrent(): QueueItem | null {
		if (this.queue.items.length === 0) {
			this.queue.currentIndex = -1;
			return null;
		}

		if (this.queue.currentIndex >= 0 && this.queue.currentIndex < this.queue.items.length) {
			return this.queue.items[this.queue.currentIndex];
		}

		// If currentIndex is invalid, try to find a valid index
		if (this.queue.items.length > 0) {
			// If currentIndex is too high, set it to the last item
			if (this.queue.currentIndex >= this.queue.items.length) {
				this.queue.currentIndex = this.queue.items.length - 1;
				return this.queue.items[this.queue.currentIndex];
			}
			// If currentIndex is negative, set it to 0
			if (this.queue.currentIndex < 0) {
				this.queue.currentIndex = 0;
				return this.queue.items[this.queue.currentIndex];
			}
		}

		return null;
	}

	/**
	 * Skip to the next item in the queue
	 */
	skip(): QueueItem | null {
		const currentItem = this.getCurrent();
		if (currentItem) {
			// Remove the current item since we're skipping it
			this.removeFromQueue(currentItem.id);
		}

		const nextItem = this.getNext();

		// Ensure currentIndex is valid after skip
		if (nextItem && this.queue.currentIndex >= 0) {
			// Verify the current item matches what we expect
			const verifyCurrent = this.getCurrent();
			if (!verifyCurrent || verifyCurrent.id !== nextItem.id) {
				const correctIndex = this.queue.items.findIndex(item => item.id === nextItem.id);
				if (correctIndex !== -1) {
					this.queue.currentIndex = correctIndex;
				}
			}
		}

		return nextItem;
	}

	/**
	 * Remove an item from the queue by ID
	 */
	removeFromQueue(id: string): boolean {
		const index = this.queue.items.findIndex(item => item.id === id);
		if (index !== -1) {
			this.queue.items.splice(index, 1);

			// Adjust current index if necessary
			if (index < this.queue.currentIndex) {
				// Removed item was before current item, decrement index
				this.queue.currentIndex--;
			} else if (index === this.queue.currentIndex) {
				// Removed the current item itself, decrement index
				this.queue.currentIndex--;
			}
			return true;
		}
		return false;
	}

	/**
	 * Clear the entire queue
	 */
	clearQueue(): void {
		this.queue.items = [];
		this.queue.currentIndex = -1;
		this.queue.isPlaying = false;
		logger.info('Queue cleared');
	}

	/**
	 * Reset the current index to -1 (no current item)
	 */
	resetCurrentIndex(): void {
		this.queue.currentIndex = -1;
	}

	/**
	 * Get all items in the queue
	 */
	getQueue(): QueueItem[] {
		return [...this.queue.items];
	}

	/**
	 * Get the queue status
	 */
	getQueueStatus(): VideoQueue {
		return { ...this.queue };
	}

	/**
	 * Set the playing state
	 */
	setPlaying(isPlaying: boolean): void {
		this.queue.isPlaying = isPlaying;
	}

	/**
	 * Check if the queue is empty
	 */
	isEmpty(): boolean {
		return this.queue.items.length === 0;
	}

	/**
	 * Get the queue length
	 */
	getLength(): number {
		return this.queue.items.length;
	}

	/**
	 * Move an item to a different position in the queue
	 */
	moveItem(fromIndex: number, toIndex: number): boolean {
		if (fromIndex < 0 || fromIndex >= this.queue.items.length ||
			toIndex < 0 || toIndex >= this.queue.items.length) {
			return false;
		}

		const item = this.queue.items.splice(fromIndex, 1)[0];
		this.queue.items.splice(toIndex, 0, item);

		// Adjust current index if necessary
		if (fromIndex === this.queue.currentIndex) {
			this.queue.currentIndex = toIndex;
		} else if (fromIndex < this.queue.currentIndex && toIndex >= this.queue.currentIndex) {
			this.queue.currentIndex--;
		} else if (fromIndex > this.queue.currentIndex && toIndex <= this.queue.currentIndex) {
			this.queue.currentIndex++;
		}

		return true;
	}

	/**
	 * Generate a unique ID for queue items
	 */
	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}
}