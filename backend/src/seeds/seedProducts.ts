import * as kv from '../stores/kv.store';
import { Product } from '../types';
import { generateUUID } from '../utils/crypto';
import { logger } from '../utils/logger';

/**
 * Seed demo products
 */
export async function seedProducts(): Promise<{ success: boolean; count: number; skipped?: boolean }> {
    try {
        logger.info('Seeding demo products...');

        // Check if products already exist
        const existing = await kv.getByPrefix<Product>('product:');

        if (existing.length > 0) {
            logger.info('Products already exist, skipping seed');
            return { success: true, count: existing.length, skipped: true };
        }

        const demoProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
            {
                name: 'Laptop Gaming ROG',
                description: 'Laptop gaming dengan performa tinggi untuk gaming dan produktivitas',
                price: 15000000,
                stock: 10,
                category: 'Electronics',
                images: ['https://via.placeholder.com/400x400?text=Laptop+Gaming'],
                isActive: true,
                isFlashSale: false
            },
            {
                name: 'Smartphone Premium',
                description: 'Smartphone flagship dengan kamera canggih dan layar AMOLED',
                price: 8000000,
                stock: 25,
                category: 'Electronics',
                images: ['https://via.placeholder.com/400x400?text=Smartphone'],
                isActive: true,
                isFlashSale: false
            },
            {
                name: 'Headphone Wireless',
                description: 'Headphone nirkabel dengan noise cancellation',
                price: 1500000,
                stock: 50,
                category: 'Audio',
                images: ['https://via.placeholder.com/400x400?text=Headphone'],
                isActive: true,
                isFlashSale: false
            }
        ];

        for (const productData of demoProducts) {
            const product: Product = {
                ...productData,
                id: generateUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await kv.set(`product:${product.id}`, product);
            logger.info(`Product seeded: ${product.name}`);
        }

        logger.success(`${demoProducts.length} products seeded successfully`);
        return { success: true, count: demoProducts.length };

    } catch (error: any) {
        logger.error('Error seeding products:', error.message);
        return { success: false, count: 0 };
    }
}
