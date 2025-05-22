// Importar o Firebase
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"


// Configuração do Firebase
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBz9dfIMGUsXw7dxjGmCVzGVGVXFhIDRwE",
  authDomain: "marciacastrocomercial-abd51.firebaseapp.com",
  projectId: "marciacastrocomercial-abd51",
  storageBucket: "marciacastrocomercial-abd51.firebasestorage.app",
  messagingSenderId: "498059072198",
  appId: "1:498059072198:web:1fa36ebaae8ff736693dc7",
  measurementId: "G-9D24FVWEC5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

export { app, db, auth }
