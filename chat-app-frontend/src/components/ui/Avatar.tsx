interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  src?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function getColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-red-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500',
  ]
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

export default function Avatar({ name, size = 'md', online, src }: AvatarProps) {
  return (
    <div className="relative flex-shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${getColor(name)} rounded-full flex items-center justify-center text-white font-semibold`}
          aria-label={name}
        >
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full border-2 border-white ${
            online ? 'bg-green-400' : 'bg-gray-400'
          }`}
          data-testid="presence-dot"
        />
      )}
    </div>
  )
}
