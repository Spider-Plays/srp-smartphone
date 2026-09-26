import DocDateField from './DocDateField'

export default function DocumentFieldInput({ field, value, onChange, readOnly }) {
  const label = field.label || 'Field'

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={label}
      />
    )
  }

  if (field.type === 'date') {
    return (
      <DocDateField
        value={value || ''}
        onChange={onChange}
        readOnly={readOnly}
        placeholder="Select date"
      />
    )
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={label}
      />
    )
  }

  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      placeholder={label}
    />
  )
}
