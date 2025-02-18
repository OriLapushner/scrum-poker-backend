export const uniqueSid = () => Math.random().toString(16).slice(3)
export const average = (array: number[]): number => Number.parseFloat((array.reduce((a, b) => a + b, 0) / array.length).toFixed(2))