import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export default function ScreenTransition({ children, className = '' }) {
  return (
    <motion.div
      className={`screen-layer ${className}`.trim()}
      style={{
        flex: 1,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
      variants={variants}
      initial={false}
      animate="animate"
      exit="exit"
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}
