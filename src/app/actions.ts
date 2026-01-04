'use server'

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

// Wir erstellen eine neue Prisma-Instanz, um mit der DB zu reden
const prisma = new PrismaClient()

export async function registerUser(formData: FormData) {
  // 1. Daten aus dem Formular holen
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  // Einfache Validierung
  if (!email || !password) {
    throw new Error('Bitte alles ausfüllen!')
  }

  // 2. Prüfen, ob User schon existiert
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    // In einer echten App würden wir hier einen Fehler zurückgeben
    console.log("User existiert schon!")
    return
  }

  // 3. Passwort verschlüsseln (hashing)
  const hashedPassword = await bcrypt.hash(password, 10)

  // 4. User in der Datenbank erstellen
  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  })

  console.log("User erfolgreich erstellt!")
  
  // 5. Weiterleiten (z.B. zum Login oder Dashboard)
  redirect('/')
}


export async function login(formData: FormData) {
  'use server' // Wichtig: Das läuft auf dem Server

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    throw new Error('Bitte alles ausfüllen')
  }

  // 1. User in der Datenbank suchen
  const user = await prisma.user.findUnique({
    where: { email }
  })

  // Wenn kein User gefunden wurde:
  if (!user) {
    console.log("User nicht gefunden")
    // In einer echten App: Fehlermeldung zurückgeben
    return
  }

  // 2. Passwort prüfen (Vergleich Hash vs. Eingabe)
  const passwordMatch = await bcrypt.compare(password, user.password)

  if (!passwordMatch) {
    console.log("Falsches Passwort!")
    return
  }

  console.log("Login erfolgreich! User: " + user.name)

  // 3. Weiterleiten (Später setzen wir hier das Session-Cookie)
  redirect('/')
}