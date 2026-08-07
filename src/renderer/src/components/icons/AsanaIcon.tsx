import { ListTodo } from 'lucide-react'

export function AsanaIcon({ className }: { className?: string }): React.JSX.Element {
  return <ListTodo className={className} aria-hidden="true" />
}
