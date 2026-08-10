-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "uuid_cloud" TEXT NOT NULL,
    "local_id" INTEGER NOT NULL,
    "id_user_local" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "ingreso" DOUBLE PRECISION NOT NULL,
    "cambio" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "estatus" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "device_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_uuid_key" ON "devices"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "devices_api_key_key" ON "devices"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "logs_uuid_cloud_key" ON "logs"("uuid_cloud");

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
