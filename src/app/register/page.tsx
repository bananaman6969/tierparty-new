import { registerUser } from '../actions'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Account erstellen</h1>
        
        {/* Das Formular ruft direkt deine Server Action auf */}
        <form action={registerUser} className="flex flex-col gap-4">
          
          <div>
            <label className="block text-sm mb-1 text-gray-400">Name</label>
            <input 
              name="name" 
              type="text" 
              placeholder="Dein Username"
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-400">Email</label>
            <input 
              name="email" 
              type="email" 
              required
              placeholder="beispiel@mail.de"
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-400">Passwort</label>
            <input 
              name="password" 
              type="password" 
              required
              placeholder="******"
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>

          <button 
            type="submit" 
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition"
          >
            Registrieren
          </button>

        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          Schon einen Account? <a href="/login" className="text-blue-400 hover:underline">Einloggen</a>
        </p>
      </div>
    </div>
  )
}