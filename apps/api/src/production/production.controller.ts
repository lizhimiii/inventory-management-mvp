import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser, Permissions } from '../auth/auth.decorators';
import { AuthUser } from '../common/constants';
import { IsQuantity } from '../common/validation';
import { ProductionService } from './production.service';

class CreateOrderDto{@IsString()finishedGoodId:string;@IsQuantity()plannedQty:string;@IsOptional()@IsString()defaultIssueWarehouseId?:string;@IsOptional()@IsDateString()plannedDate?:string;@IsOptional()@IsString()@MaxLength(500)notes?:string;}
class UpdateOrderDto{@IsOptional()@IsQuantity()plannedQty?:string;@IsOptional()@IsString()defaultIssueWarehouseId?:string;@IsOptional()@IsDateString()plannedDate?:string;@IsOptional()@IsString()@MaxLength(500)notes?:string;}
class MaterialLineDto{@IsString()materialId:string;@IsQuantity()quantity:string;@IsOptional()@IsString()locationId?:string;@IsOptional()@IsString()batchId?:string;}
class MaterialActionDto{@IsOptional()@IsString()warehouseId?:string;@IsArray()@ArrayMinSize(1)@ValidateNested({each:true})@Type(()=>MaterialLineDto)lines:MaterialLineDto[];@IsOptional()@IsString()@MaxLength(500)notes?:string;}
class CompleteDto{@IsOptional()@IsString()warehouseId?:string;@IsQuantity()quantity:string;@IsOptional()@IsString()locationId?:string;@IsOptional()@IsString()batchId?:string;@IsOptional()@IsString()@MaxLength(500)notes?:string;}
class CancelDto{@IsOptional()@IsString()@MaxLength(500)reason?:string;}

@ApiTags('生产任务') @Controller('production-orders')
export class ProductionController{
  constructor(private readonly service:ProductionService){}
  @ApiOperation({summary:'查询生产任务列表（支持按状态、成品、仓库等过滤）'})
  @Permissions('production.view')@Get()list(@Query()q:any){return this.service.list(q);}
  @ApiOperation({summary:'查看生产任务详情（含 BOM 物料、已领/已退/已完工数量）'})
  @Permissions('production.view')@Get(':id')get(@Param('id')id:string){return this.service.get(id);}
  @ApiOperation({summary:'查询生产任务缺料清单（对比 BOM 需求量与当前可用库存）'})
  @Permissions('production.view')@Get(':id/shortages')shortages(@Param('id')id:string){return this.service.shortages(id);}
  @ApiOperation({summary:'创建生产任务（指定成品、计划数量、默认领料仓库、计划日期）'})
  @Permissions('production.manage')@Post()create(@Body()dto:CreateOrderDto,@CurrentUser()u:AuthUser){return this.service.create(dto,u.id);}
  @ApiOperation({summary:'修改生产任务（仅限未释放状态；可改计划数量、默认仓库、备注）'})
  @Permissions('production.manage')@Patch(':id')update(@Param('id')id:string,@Body()dto:UpdateOrderDto,@CurrentUser()u:AuthUser){return this.service.update(id,dto,u.id);}
  @ApiOperation({summary:'释放生产任务（DRAFT → RELEASED，允许领料）'})
  @Permissions('production.manage')@Post(':id/release')release(@Param('id')id:string,@CurrentUser()u:AuthUser){return this.service.release(id,u.id);}
  @ApiOperation({summary:'生产领料（RELEASED 状态下按 BOM 领料，自动生成领料单并过账扣减库存）'})
  @Permissions('production.issue')@Post(':id/issue')issue(@Param('id')id:string,@Body()dto:MaterialActionDto,@Headers('idempotency-key')key:string|undefined,@CurrentUser()u:AuthUser){return this.service.issue(id,dto,key,u.id);}
  @ApiOperation({summary:'生产退料（领料过多或未使用的物料退回仓库）'})
  @Permissions('production.issue')@Post(':id/return')returnMaterial(@Param('id')id:string,@Body()dto:MaterialActionDto,@Headers('idempotency-key')key:string|undefined,@CurrentUser()u:AuthUser){return this.service.returnMaterial(id,dto,key,u.id);}
  @ApiOperation({summary:'完工报产（生产任务完成后成品入库到指定仓库/库位，自动生成成品入库单进入审核）'})
  @Permissions('production.complete')@Post(':id/complete')complete(@Param('id')id:string,@Body()dto:CompleteDto,@Headers('idempotency-key')key:string|undefined,@CurrentUser()u:AuthUser){return this.service.complete(id,dto,key,u.id);}
  @ApiOperation({summary:'取消生产任务（仅限 DRAFT 或 RELEASED 状态，已完工/已发料需先处理单据）'})
  @Permissions('production.manage')@Post(':id/cancel')cancel(@Param('id')id:string,@Body()dto:CancelDto,@CurrentUser()u:AuthUser){return this.service.cancel(id,dto.reason,u.id);}
}
