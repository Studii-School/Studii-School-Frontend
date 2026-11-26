$ErrorActionPreference = 'Stop'
$root = 'C:\Users\user\Desktop\Projects\studii-school-backend\src\classes'
$controllerPath = Join-Path $root 'classes.controller.ts'
$servicePath = Join-Path $root 'classes.service.ts'

$controller = [System.IO.File]::ReadAllText($controllerPath).Replace("`r`n", "`n")
$controller = [regex]::Replace($controller, "(?m)^(import \{ SetClassOwnersDto \} from './dto/set-class-owners\.dto';\n)+", "import { SetClassOwnersDto } from './dto/set-class-owners.dto';`n")
$ownerStart = $controller.IndexOf("  @Patch(':id/owners')")
$ownerEnd = $controller.IndexOf("  @Delete(':id/teacher')", $ownerStart)
if ($ownerStart -lt 0 -or $ownerEnd -lt 0) { throw 'Could not locate the class owner controller region.' }
$ownerRegion = $controller.Substring($ownerStart, $ownerEnd - $ownerStart)
$firstMethodClose = [regex]::Match($ownerRegion, "(?m)^  \}\n")
if (-not $firstMethodClose.Success) { throw 'Could not locate the first class owner handler.' }
$singleOwnerRoute = $ownerRegion.Substring(0, $firstMethodClose.Index + $firstMethodClose.Length) + "`n"
$controller = $controller.Substring(0, $ownerStart) + $singleOwnerRoute + $controller.Substring($ownerEnd)
[System.IO.File]::WriteAllText($controllerPath, $controller, [System.Text.UTF8Encoding]::new($false))

$service = [System.IO.File]::ReadAllText($servicePath).Replace("`r`n", "`n")
$service = [regex]::Replace($service, "(?m)^(import \{ SetClassOwnersDto \} from './dto/set-class-owners\.dto';\n)+", "import { SetClassOwnersDto } from './dto/set-class-owners.dto';`n")
$methodStart = $service.IndexOf('  async setOwners(')
$methodEnd = $service.IndexOf('  async removeTeacher(', $methodStart)
if ($methodStart -lt 0 -or $methodEnd -lt 0) { throw 'Could not locate the class owner service region.' }
$methodRegion = $service.Substring($methodStart, $methodEnd - $methodStart)
$firstMethodClose = [regex]::Match($methodRegion, "(?m)^  \}\n")
if (-not $firstMethodClose.Success) { throw 'Could not locate the first class owner service method.' }
$singleOwnerMethod = $methodRegion.Substring(0, $firstMethodClose.Index + $firstMethodClose.Length) + "`n"
$service = $service.Substring(0, $methodStart) + $singleOwnerMethod + $service.Substring($methodEnd)
[System.IO.File]::WriteAllText($servicePath, $service, [System.Text.UTF8Encoding]::new($false))
