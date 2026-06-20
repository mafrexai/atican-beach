import { revalidatePath } from 'next/cache'

export async function refreshAfterImageUpload(
  type: 'room' | 'tent' | 'experience',
  id: string
) {
  revalidatePath('/admin/' + type + 's/' + id + '/media')
  revalidatePath('/' + type + 's/' + id)
  revalidatePath('/' + type + 's')
  revalidatePath('/')
}