import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBKQxxYKX1Xamh0SCdgnlMYpwwCAUEIQ8I',
  authDomain: 'music2-storage-debc4.firebaseapp.com',
  projectId: 'music2-storage-debc4',
  storageBucket: 'music2-storage-debc4.appspot.com',
  messagingSenderId: '259441771567',
  appId: '1:259441771567:web:bf767236dd6daf7ebe32da',
  measurementId: 'G-L8FTKHF0LL',
};

export const app = initializeApp(firebaseConfig);
export default getStorage(app);
