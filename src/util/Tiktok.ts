import axios, { AxiosResponse } from 'axios';

export class TiktokLive {
    public url: string = '';
    public user: string = '';
    public room_id: string = '';

    async getRoomAndUserFromUrl(): Promise<[string, string]> {
        try {
            const response: AxiosResponse<string> = await axios.get(this.url, {
                maxRedirects: 0,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const content: string = response.data;

            if (response.status === 302) {
                throw new Error('Redirect');
            }

            if (response.status === 301) { // MOBILE URL
                const regex = /com\/@(.*?)\/live/g;
                const matches = regex.exec(content);
                if (!matches || matches.length < 2) {
                    throw new Error('Live Not Found');
                }
                this.user = matches[1];
                this.room_id = await this.getRoomIdFromUser();
                return [this.user, this.room_id];
            }

            this.user = /com\/@(.*?)\/live/g.exec(content)![1];
            this.room_id = /room_id=(.*?)\"\/>/g.exec(content)![1];
            return [this.user, this.room_id];
        } catch (error) {
            throw error;
        }
    }

    async getRoomIdFromUser(): Promise<string> {
        try {
            const response: AxiosResponse<string> = await axios.get(`https://www.tiktok.com/@${this.user}/live`, { maxRedirects: 0 });

            if (response.status === 302) {
                throw new Error('Redirect');
            }

            const content: string = response.data;

            if (!content.includes('room_id')) {
                throw new Error('ValueError');
            }

            const room_id = /room_id=(.*?)\"\/>/g.exec(content)![1];
            return room_id;
        } catch (error) {
            throw error;
        }
    }

    async getLiveUrl(): Promise<string> {
        try {
            const url = `https://webcast.tiktok.com/webcast/room/info/?aid=1988&room_id=${this.room_id}`;
            const response: AxiosResponse<any> = await axios.get(url);
            const jsonData = response.data;

            if (jsonData && 'This account is private' in jsonData) {
                throw new Error('Account is private, login required');
            }

            const liveUrlFlv = jsonData.data.stream_url.rtmp_pull_url;

            return liveUrlFlv;
        } catch (error) {
            throw error;
        }
    }
}