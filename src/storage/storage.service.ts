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

  public async deleteProfileImage(name: string) {
    try {
      const imageRef = ref(this.storage, this.usersAvatarsFolder + `/${name}`);
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

  public async deleteSongFiles(songFileName: string, songImageName: string) {
    try {
      const imageRef = ref(
        this.storage,
        this.songsImagesFolder + `/${songImageName}`,
      );
      const fileRef = ref(
        this.storage,
        this.usersAvatarsFolder + `/${songFileName}`,
      );
      return Promise.all([deleteObject(imageRef), deleteObject(fileRef)]);
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

  public async deletePlaylistImage(name) {
    try {
      const imageRef = ref(this.storage, this.usersAvatarsFolder + `/${name}`);
      return deleteObject(imageRef);
    } catch (error) {
      throw error;
    }
  }
}
