import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Configuration publique de l'application web Firebase (ces valeurs ne sont pas secrètes)
const firebaseConfig = {
  apiKey: 'AIzaSyD9QfDKkGKexjLKbTn6eMC9A9NsxmUIZM0',
  authDomain: 'asepconsulting-43dc2.firebaseapp.com',
  projectId: 'asepconsulting-43dc2',
  storageBucket: 'asepconsulting-43dc2.firebasestorage.app',
  messagingSenderId: '815732194525',
  appId: '1:815732194525:web:d929e705f9f8f6f90faf34',
  measurementId: 'G-GVE9719JZJ',
};

export const app = initializeApp(firebaseConfig);

// Analytics uniquement en production et si le navigateur le permet
if (import.meta.env.PROD) {
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(app);
    })
    .catch(() => {
      // Analytics indisponible (bloqueur de pub, navigation privée…)
    });
}
