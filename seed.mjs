import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with demo data...');

  // 1. Setup Settings
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      companyName: 'Acme Corporation',
      address: '123 Tech Lane, Innovation City',
      email: 'sales@acmecorp.com',
      phone: '+1 (555) 123-4567'
    }
  });

  // 2. Add Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'TechFlow Solutions',
      email: 'billing@techflow.io',
      phone: '+1 (555) 987-6543',
      address: '4500 Enterprise Way, Suite 200'
    }
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Global Logistics Inc',
      email: 'procurement@globallogistics.com',
      phone: '+1 (555) 345-6789',
      address: '100 Port Drive, Dock B'
    }
  });

  // 3. Add Products
  const product1 = await prisma.product.create({
    data: {
      name: 'Enterprise Server Node',
      sku: 'SRV-ENT-001',
      price: 150000,
      description: 'High performance rack-mounted server node',
      discount: 0
    }
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Cloud Storage Drive (16TB)',
      sku: 'DRV-16TB-PRO',
      price: 45000,
      description: 'Enterprise grade SSD storage',
      discount: 5
    }
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Network Switch (24 Port)',
      sku: 'NET-SW-24',
      price: 85000,
      description: 'Managed gigabit ethernet switch',
      discount: 0
    }
  });

  const product4 = await prisma.product.create({
    data: {
      name: 'Premium Support SLA (1 Year)',
      sku: 'SRV-SLA-1YR',
      price: 120000,
      description: '24/7 technical support and rapid response',
      discount: 10
    }
  });

  // 4. Create a Sample Quote
  await prisma.quote.create({
    data: {
      quoteNumber: 'QT-DEMO-001',
      customerId: customer1.id,
      discount: 0,
      total: 322500, // (150000*1) + (45000*2*0.95) + (85000*1)
      items: {
        create: [
          {
            productId: product1.id,
            name: product1.name,
            price: product1.price,
            quantity: 1,
            discount: product1.discount
          },
          {
            productId: product2.id,
            name: product2.name,
            price: product2.price,
            quantity: 2,
            discount: product2.discount
          },
          {
            productId: product3.id,
            name: product3.name,
            price: product3.price,
            quantity: 1,
            discount: product3.discount
          }
        ]
      }
    }
  });

  console.log('Demo data added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
