import { Injectable, OnModuleInit } from '@nestjs/common';
import Storage from './config';
import {
  FirebaseStorage,
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  
} from 'firebase/storage';

@Injectable()
export class StorageService implements OnModuleInit {
  public storage: FirebaseStorage;

  private usersAvatarsFolder = 'users-avatars';
  private usersSongsFolder = 'users-songs';
  private playlistsImagesFolder = 'playlists-images';
  private songsImagesFolder = 'songs-images';

  onModuleInit() {
    this.storage = Storage;
  }

  public async uploadProfileImage(file: Express.Multer.File, name: string) {
    try {
      const imageRef = ref(this.storage, this.usersAvatarsFolder + `/${name}`);
      await uploadBytes(imageRef, file.buffer);
      return getDownloadURL(imageRef);
    } catch (error) {
      throw error;
    }
  }

  public async changeProfileImage(file: Express.Multer.File, name: string) {
    try {
      const imageRef = ref(this.storage, this.usersAvatarsFolder + `/${name}`);
      await deleteObject(imageRef);
      await uploadBytes(imageRef, file.buffer);
      return getDownloadURL(imageRef);
    } catch (error) {
      throw error;
    }
  }

  public async deleteProfileImage(url: string) {
    try {
      const imageRef = ref(this.storage, url);
      return deleteObject(imageRef);
    } catch (error) {
      throw error;
    }
  }

  public async uploadSongFile(file: Express.Multer.File, name: string) {
    try {
      const imageRef = ref(this.storage, this.usersSongsFolder + `/${name}`);
      await uploadBytes(imageRef, file.buffer);
      return getDownloadURL(imageRef);
    } catch (error) {
      throw error;
    }
  }

  public async uploadSongImage(file: Express.Multer.File, name: string) {
    try {
      const imageRef = ref(this.storage, this.songsImagesFolder + `/${name}`);
      await uploadBytes(imageRef, file.buffer);
      return getDownloadURL(imageRef);
    } catch (error) {
      throw error;
    }
  }

  public getSongFile(name: string) {
    try {
      const imageRef = ref(this.storage, this.usersSongsFolder + `/${name}`);
      return getDownloadURL(imageRef);
    } catch (error) {
      return null;
    }
  }

  public async deleteSongFile(url: string) {
    try {
      const fileRef = ref(this.storage, url);
      return deleteObject(fileRef);
    } catch (error) {
      throw error;
    }
  }

  public async deleteSongImage(url: string) {
    try {
      const imageRef = ref(this.storage, url);
      return deleteObject(imageRef);
    } catch (error) {
      throw error;
    }
  }

  public async uploadPlaylistImage(file: Express.Multer.File, name: string) {
    try {
      const imageRef = ref(
        this.storage,
        this.playlistsImagesFolder + `/${name}`,
      );
      await uploadBytes(imageRef, file.buffer);
      return getDownloadURL(imageRef);
    } catch (error) {
      throw error;
    }
  }

  public async deletePlaylistImage(url: string) {
    try {
      const imageRef = ref(this.storage, url);
      return deleteObject(imageRef);
    } catch (error) {
      throw error;
    }
  }
}
