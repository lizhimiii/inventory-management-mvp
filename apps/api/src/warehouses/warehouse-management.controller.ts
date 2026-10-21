import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../auth/auth.decorators';
import { AuthUser } from '../common/constants';
import { WarehouseManagementService } from './warehouse-management.service';

@ApiTags('仓库管理工作台')
@Controller('warehouse-management')
export class WarehouseManagementController {
  constructor(private readonly service: WarehouseManagementService) {}
  @ApiOperation({summary:'获取仓库工作台仓库列表（含库区/库位数量、物料种类、容量占用）'})
  @Get('warehouses') @Permissions('warehouse.capacity.view','inventory.view') warehouses(@CurrentUser() user: AuthUser) { return this.service.warehouses(user); }
  @ApiOperation({summary:'获取指定仓库的库区列表（含库位数量、库存统计）'})
  @Get('warehouses/:id/zones') @Permissions('warehouse.capacity.view','inventory.view') zones(@Param('id') id: string,@CurrentUser() user: AuthUser) { return this.service.zones(user,id); }
  @ApiOperation({summary:'获取指定库区的库位列表（含库存汇总、容量占用、冻结数量）'})
  @Get('zones/:id/locations') @Permissions('warehouse.capacity.view','inventory.view') locations(@Param('id') id: string,@CurrentUser() user: AuthUser) { return this.service.locations(user,id); }
  @ApiOperation({summary:'获取仓库/库区/库位的上下文详情（含汇总、子节点列表、仓库管理员绑定）'})
  @Get('context/:type/:id') @Permissions('warehouse.capacity.view','inventory.view') context(@Param('type') type: 'warehouse'|'zone'|'location',@Param('id') id: string,@CurrentUser() user: AuthUser) { return this.service.context(user,type,id); }
  @ApiOperation({summary:'查询库位上的物料（含可用数量、预留数量、批次分布）'})
  @Get('locations/:id/materials') @Permissions('warehouse.capacity.view','inventory.view') materials(@Param('id') id: string,@Query() q: any,@CurrentUser() user: AuthUser) { return this.service.materials(user,id,q); }
  @ApiOperation({summary:'全局搜索仓库/库区/库位/物料（按关键字模糊匹配）'})
  @Get('search') @Permissions('warehouse.capacity.view','inventory.view') search(@Query('keyword') keyword: string,@CurrentUser() user: AuthUser) { return this.service.search(user,keyword); }
  @ApiOperation({summary:'获取最近库存活动（出入库交易、单据状态变更等，按时间倒序）'})
  @Get('activity') @Permissions('warehouse.capacity.view','inventory.view') activity(@Query() q: any,@CurrentUser() user: AuthUser) { return this.service.activity(user,q); }
  @ApiOperation({summary:'保存库位-物料规则（容量上限、混放限制、存放策略）'})
  @Put('locations/:locationId/item-rules/:itemId') @Permissions('warehouse.capacity.manage') saveRule(@Param('locationId') locationId: string,@Param('itemId') itemId: string,@Body() dto: any,@CurrentUser() user: AuthUser) { return this.service.saveRule(user,locationId,itemId,dto); }
  @ApiOperation({summary:'删除库位-物料规则'})
  @Delete('locations/:locationId/item-rules/:itemId') @Permissions('warehouse.capacity.manage') removeRule(@Param('locationId') locationId: string,@Param('itemId') itemId: string,@CurrentUser() user: AuthUser) { return this.service.removeRule(user,locationId,itemId); }
  @ApiOperation({summary:'申请操作锁（冻结指定库位/物料，防止同期并发操作）'})
  @Post('operation-locks') @Permissions('stock.freeze') lock(@Body() dto: any,@CurrentUser() user: AuthUser) { return this.service.lock(user,dto); }
  @ApiOperation({summary:'释放操作锁'})
  @Post('operation-locks/:id/release') @Permissions('stock.freeze') unlock(@Param('id') id: string,@CurrentUser() user: AuthUser) { return this.service.unlock(user,id); }
}
