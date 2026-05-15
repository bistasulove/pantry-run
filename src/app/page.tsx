import { redirect } from 'next/navigation'

// M2 will branch here: signed-in users with a household go to /list,
// everyone else continues to /welcome.
export default function Home() {
  redirect('/welcome')
}
